const { supabaseAdmin } = require('../config/supabase');
const pricingService = require('./pricingService');
const budgetService = require('./budgetService');
const logger = require('../config/logger');

/**
 * Usage Logging Service
 *
 * Logs successful AI API usage for cost tracking and analytics.
 * Creates finance-grade ledger entries with immutable records.
 * Supports OpenAI (gpt-*, o*) and Anthropic (claude-*) models.
 */
class UsageLoggingService {

    /**
     * Log a successful AI API request.
     *
     * @param {Object} params - Logging parameters
     * @param {string} params.request_id - SpendAI request ID (UUID)
     * @param {string} params.organization_id - Organization UUID
     * @param {string} params.project_id - Project UUID
     * @param {string} params.proxy_key_id - Proxy key UUID
     * @param {string} params.model - Model name (e.g., gpt-4, claude-3-haiku)
     * @param {string} [params.provider='openai'] - Provider ('openai'|'anthropic')
     * @param {number} params.prompt_tokens - Input tokens
     * @param {number} params.completion_tokens - Output tokens
     * @param {number} params.total_tokens - Total tokens
     */
    async logUsage(params) {
        const {
            request_id,
            organization_id,
            project_id,
            proxy_key_id,
            model,
            provider = 'openai',
            prompt_tokens,
            completion_tokens,
            total_tokens
        } = params;

        // 1. Validation
        if (!request_id || !organization_id || !project_id || !proxy_key_id || !model) {
            throw new Error('Missing required fields for usage logging');
        }
        if (typeof prompt_tokens !== 'number' || typeof completion_tokens !== 'number') {
            throw new Error('Token counts must be numbers');
        }

        try {
            // 2. Calculate cost based on current pricing
            const cost_usd = pricingService.calculateCost(model, prompt_tokens, completion_tokens);

            // 3. Get pricing snapshot for the audit trail
            const pricing = pricingService.getModelPricing(model);
            const price_prompt_per_million = pricing ? pricing.prompt : null;
            const price_completion_per_million = pricing ? pricing.completion : null;

            // 4. Insert into DB (synchronous write)
            const { data, error } = await supabaseAdmin
                .from('usage_logs')
                .insert({
                    request_id,
                    organization_id,
                    project_id,
                    proxy_key_id,
                    model,
                    provider,  // 'openai', 'anthropic', or 'google'
                    tokens_prompt: prompt_tokens,
                    tokens_completion: completion_tokens,
                    cost_usd,
                    price_prompt_per_million,
                    price_completion_per_million,
                    currency: 'USD',
                    status: 'success'
                })
                .select()
                .single();

            if (error) {
                logger.error(`[${request_id}] Failed to log usage to DB: ${error.message}`, 'USAGE');
                throw new Error(`Failed to log usage: ${error.message}`);
            }

            logger.info(`[${request_id}] Usage logged: ${provider}/${model}, ${total_tokens} tokens, $${cost_usd.toFixed(6)}`, 'USAGE');

            // 5. Check budgets and trigger alerts (fire and forget)
            budgetService.checkBudgets(organization_id, project_id).catch(err => {
                logger.error(`[${request_id}] Budget check failed: ${err.message}`, 'BUDGET');
            });

            return { success: true, log: data };

        } catch (error) {
            logger.error(`[${request_id}] Usage logging error: ${error.message}`, 'USAGE');
            throw error;
        }
    }

    /**
     * Extract usage data from an OpenAI-formatted response object.
     * Note: Anthropic responses are converted to this format by the proxy service first.
     */
    extractUsageFromResponse(response) {
        if (!response || !response.usage || !response.model) {
            return null;
        }

        const { prompt_tokens, completion_tokens, total_tokens } = response.usage;

        if (typeof prompt_tokens !== 'number' || typeof completion_tokens !== 'number') {
            return null;
        }

        return {
            model: response.model,
            prompt_tokens,
            completion_tokens,
            total_tokens: total_tokens ?? (prompt_tokens + completion_tokens)
        };
    }

    /**
     * Convenience method: extract and log in one call.
     */
    async logFromOpenAIResponse(params) {
        const {
            request_id,
            organization_id,
            project_id,
            proxy_key_id,
            openaiResponse,
            provider = 'openai'
        } = params;

        const usage = this.extractUsageFromResponse(openaiResponse);

        if (!usage) {
            logger.warn(`[${request_id}] Skipping usage logging: 'usage' object missing or invalid in response.`, 'USAGE');
            return null;
        }

        return await this.logUsage({
            request_id,
            organization_id,
            project_id,
            proxy_key_id,
            model: usage.model,
            provider,
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            total_tokens: usage.total_tokens
        });
    }
}

module.exports = new UsageLoggingService();
