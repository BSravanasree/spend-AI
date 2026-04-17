const express = require('express');
const openaiProxyService = require('../services/openaiProxyService');
const { proxyLimiter } = require('../middleware/rateLimit');
const { supabaseAdmin } = require('../config/supabase');
const encryptionService = require('../services/encryptionService');
const logger = require('../config/logger');

const router = express.Router();

/**
 * Pre-request budget guard middleware
 *
 * Runs BEFORE the request is forwarded to any AI provider.
 * - Fetches org's monthly_budget_usd
 * - Calculates MTD spend from usage_logs
 * - Blocks (HTTP 429) if spend >= budget
 * - Passes if no budget set (NULL = unlimited)
 */
async function preBudgetGuard(keyData, res) {
    const { organization_id } = keyData;

    // 1. Get org budget
    const { data: org, error: orgErr } = await supabaseAdmin
        .from('organizations')
        .select('monthly_budget_usd, name')
        .eq('id', organization_id)
        .single();

    if (orgErr) {
        logger.error(
            `[BudgetGuard] FAIL-OPEN: Could not fetch org ${organization_id}: ${orgErr.message} — budget check bypassed`,
            'BUDGET'
        );
        return { blocked: false, bypassReason: 'org_fetch_error' }; // Fail open — don't block on DB errors
    }

    // NULL budget = unlimited; skip check
    if (!org.monthly_budget_usd) {
        return { blocked: false };
    }

    // 2. Calculate MTD spend
    const startOfMonth = new Date(Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        1
    )).toISOString();

    const { data: logs, error: logErr } = await supabaseAdmin
        .from('usage_logs')
        .select('cost_usd')
        .eq('organization_id', organization_id)
        .gte('created_at', startOfMonth);

    if (logErr) {
        logger.error(
            `[BudgetGuard] FAIL-OPEN: Could not fetch usage logs for ${organization_id}: ${logErr.message} — budget check bypassed`,
            'BUDGET'
        );
        return { blocked: false, bypassReason: 'usage_fetch_error' }; // Fail open
    }

    const mtdSpend = (logs || []).reduce((sum, row) => sum + parseFloat(row.cost_usd || 0), 0);
    const budget = parseFloat(org.monthly_budget_usd);

    logger.info(`[BudgetGuard] Org ${organization_id} MTD: $${mtdSpend.toFixed(6)} / Budget: $${budget}`, 'BUDGET');

    // 3. Hard block at 100%
    if (mtdSpend >= budget) {
        return {
            blocked: true,
            mtdSpend,
            budget,
            orgName: org.name
        };
    }

    return { blocked: false, mtdSpend, budget };
}

/**
 * POST /v1/chat/completions
 *
 * Unified AI proxy endpoint.
 * Supports: OpenAI (gpt-*), Anthropic (claude-*).
 * Routes based on model name prefix.
 *
 * Headers:
 *   Authorization: Bearer <spendai_proxy_key>
 *
 * Body: Same as OpenAI chat completions API
 */
router.post('/chat/completions', proxyLimiter, async (req, res) => {
    try {
        // 1. Extract proxy key from Authorization header
        const authHeader = req.headers.authorization;
        const proxyKey = openaiProxyService.extractBearerToken(authHeader);

        if (!proxyKey) {
            return res.status(401).json({
                error: {
                    message: 'Missing or invalid Authorization header. Use: Authorization: Bearer <proxy_key>',
                    type: 'invalid_request_error',
                    code: 'invalid_api_key'
                }
            });
        }

        // 2. Validate request body
        const validation = openaiProxyService.validateChatCompletionRequest(req.body);
        if (!validation.valid) {
            return res.status(400).json({
                error: {
                    message: validation.error,
                    type: 'invalid_request_error',
                    code: 'invalid_request'
                }
            });
        }

        // 3. Detect provider from model name (BEFORE any external call)
        const model = req.body.model || '';
        const provider = openaiProxyService.detectProvider(model);

        if (!provider) {
            return res.status(400).json({
                error: {
                    message: `Unknown model prefix: ${model}. Supported prefixes: gpt-, o1, o3, claude-, gemini-`,
                    type: 'invalid_request_error',
                    code: 'invalid_model'
                }
            });
        }

        // 4. ── BUDGET GUARD (runs BEFORE forwarding to any provider) ──────────
        //    Validate the proxy key first to get org context
        const keyData = await openaiProxyService.validateProxyKey(proxyKey);

        const budgetCheck = await preBudgetGuard(keyData, res);

        // If guard failed-open, add a header so it's visible in logs/tracing
        if (budgetCheck.bypassReason) {
            res.setHeader('X-SpendAI-Budget-Check', 'bypassed');
            res.setHeader('X-SpendAI-Bypass-Reason', budgetCheck.bypassReason);
        }

        if (budgetCheck.blocked) {
            logger.warn(
                `[BudgetGuard] BLOCKED org ${keyData.organization_id} — ` +
                `MTD $${budgetCheck.mtdSpend.toFixed(4)} >= budget $${budgetCheck.budget}`,
                'BUDGET'
            );
            return res.status(429).json({
                error: 'Budget exceeded',
                message:
                    'Your organization has reached its monthly AI spending limit. ' +
                    'Upgrade your plan or contact your admin.',
                code: 'BUDGET_EXCEEDED',
                details: {
                    mtd_spend_usd: budgetCheck.mtdSpend,
                    budget_usd: budgetCheck.budget
                }
            });
        }
        // ─────────────────────────────────────────────────────────────────────

        // Fetch organization to get provider keys (like google_api_key)
        const { data: org } = await supabaseAdmin
            .from('organizations')
            .select('*')
            .eq('id', keyData.organization_id)
            .single();

        let result;
        if (model.startsWith('gemini-') && org?.google_api_key) {
            const googleApiKey = encryptionService.decrypt(org.google_api_key);
            const geminiResponse = await openaiProxyService.forwardToGemini(req.body, googleApiKey);
            result = {
                statusCode: 200,
                response: geminiResponse,
                metadata: { spendai_request_id: `gemini_${Math.random().toString(36).substring(7)}` }
            };
            // Log Gemini
            const usageLoggingService = require('../services/usageLoggingService');
            usageLoggingService.logFromOpenAIResponse({
                request_id: result.metadata.spendai_request_id,
                organization_id: keyData.organization_id,
                project_id: keyData.project_id,
                proxy_key_id: keyData.id,
                openaiResponse: geminiResponse,
                provider: 'google'
            }).catch(() => { });
        } else {
            result = await openaiProxyService.proxyChatCompletion(proxyKey, req.body, req.headers, provider, keyData);
        }

        // 6. Return response with SpendAI request ID header
        res.setHeader('x-spendai-request-id', result.metadata.spendai_request_id);
        return res.status(result.statusCode).json(result.response);

    } catch (error) {
        logger.error(`Proxy route error: ${error.message}`, 'PROXY');

        if (error.code === 'INVALID_MODEL' || error.message.includes('Unsupported model')) {
            return res.status(400).json({
                error: {
                    message: error.message,
                    type: 'invalid_request_error',
                    code: 'invalid_model'
                }
            });
        } else if (error.message.includes('proxy key')) {
            return res.status(401).json({
                error: {
                    message: 'Invalid or revoked proxy key',
                    type: 'invalid_request_error',
                    code: 'invalid_api_key'
                }
            });
        } else if (error.message.includes('OpenAI API key not configured') || error.message.includes('API key not configured')) {
            return res.status(500).json({
                error: {
                    message: 'Organization AI provider API key not configured',
                    type: 'server_error',
                    code: 'configuration_error'
                }
            });
        } else if (error.message.includes('decrypt')) {
            return res.status(500).json({
                error: {
                    message: 'Failed to decrypt organization API key',
                    type: 'server_error',
                    code: 'decryption_error'
                }
            });
        } else if (error.message.includes('timeout')) {
            return res.status(504).json({
                error: {
                    message: 'AI provider request timeout',
                    type: 'server_error',
                    code: 'timeout'
                }
            });
        } else {
            return res.status(500).json({
                error: {
                    message: 'Internal proxy error',
                    type: 'server_error',
                    code: 'internal_error'
                }
            });
        }
    }
});

/**
 * Health check for proxy endpoint
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'SpendAI AI Proxy',
        version: '2.0.0',
        providers: ['openai', 'anthropic', 'gemini'],
        security: {
            key_encryption: 'AES-256-GCM',
            key_validation: 'HMAC-SHA256',
            model_validation: 'Allowlist',
            header_filtering: 'Whitelist',
            budget_guard: 'Pre-request'
        },
        endpoints: {
            chat_completions: '/v1/chat/completions'
        }
    });
});

module.exports = router;
