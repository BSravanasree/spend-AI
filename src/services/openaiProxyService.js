const axios = require('axios');
const crypto = require('crypto');
const proxyKeyService = require('./proxyKeyService');
const encryptionService = require('./encryptionService');
const usageLoggingService = require('./usageLoggingService');
const { supabaseAdmin } = require('../config/supabase');
const logger = require('../config/logger');

/**
 * OpenAI / Anthropic Proxy Service
 *
 * Supports:
 *   - OpenAI:    gpt-*, o1, o3 models
 *   - Anthropic: claude-* models (converted to OpenAI-compatible response format)
 *
 * Security features:
 *   - AES-256-GCM encrypted API keys at rest
 *   - HMAC-validated proxy keys
 *   - Model allowlist
 *   - Header whitelist (no passthrough of dangerous client headers)
 *   - Request ID tracing
 *   - Pre-request budget guard (in route layer)
 */
class OpenAIProxyService {

    // ─────────────────────────────────────────────────────────────────────────
    // Model allowlists
    // ─────────────────────────────────────────────────────────────────────────

    getSupportedOpenAIModels() {
        return [
            'gpt-3.5-turbo',
            'gpt-3.5-turbo-0125',
            'gpt-3.5-turbo-1106',
            'gpt-4',
            'gpt-4-0613',
            'gpt-4-turbo',
            'gpt-4-turbo-preview',
            'gpt-4o',
            'gpt-4o-mini',
            'o1',
            'o1-mini',
            'o1-preview',
            'o3',
            'o3-mini'
        ];
    }

    getSupportedAnthropicModels() {
        return [
            'claude-3-haiku-20240307',
            'claude-3-sonnet-20240229',
            'claude-3-opus-20240229',
            'claude-3-5-sonnet-20240620',
            'claude-3-5-sonnet-20241022',
            'claude-3-5-haiku-20241022',
            'claude-3-7-sonnet-20250219',
            'claude-opus-4-5',
            'claude-sonnet-4-5'
        ];
    }

    getSupportedGeminiModels() {
        return [
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'gemini-1.5-flash-8b'
        ];
    }

    /**
     * Detect provider from model name.
     * @returns {'openai'|'anthropic'|'gemini'|null}
     */
    detectProvider(model) {
        if (!model || typeof model !== 'string') return null;
        if (model.startsWith('claude-')) return 'anthropic';
        if (model.startsWith('gemini-')) return 'gemini';
        if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3')) return 'openai';
        return null;
    }

    /**
     * Validate model against the correct allowlist.
     */
    validateModel(model) {
        if (!model || typeof model !== 'string') {
            return { valid: false, error: 'model is required' };
        }

        const provider = this.detectProvider(model);

        if (provider === 'openai') {
            if (!this.getSupportedOpenAIModels().includes(model)) {
                return {
                    valid: false,
                    error: `Unsupported OpenAI model: ${model}. Supported: ${this.getSupportedOpenAIModels().join(', ')}`
                };
            }
        } else if (provider === 'anthropic') {
            if (!this.getSupportedAnthropicModels().includes(model)) {
                return {
                    valid: false,
                    error: `Unsupported Anthropic model: ${model}. Supported: ${this.getSupportedAnthropicModels().join(', ')}`
                };
            }
        } else if (provider === 'gemini') {
            if (!this.getSupportedGeminiModels().includes(model)) {
                return {
                    valid: false,
                    error: `Unsupported Gemini model: ${model}. Supported: ${this.getSupportedGeminiModels().join(', ')}`
                };
            }
        } else {
            return {
                valid: false,
                error: `Unknown model: ${model}. Use a gpt-* (OpenAI), claude-* (Anthropic), or gemini-* (Google) model.`
            };
        }

        return { valid: true, provider };
    }

    /**
     * Generate unique request ID for tracing (UUID v4).
     */
    generateRequestId() {
        return crypto.randomUUID();
    }

    /**
     * Extract Bearer token from Authorization header.
     */
    extractBearerToken(authHeader) {
        if (!authHeader || typeof authHeader !== 'string') return null;
        return authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Key retrieval (decrypted from DB)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get organization's OpenAI API key (AES-256-GCM decrypted).
     */
    async getOrganizationOpenAIKey(organizationId) {
        return this._getOrgKey(organizationId, 'openai_api_key', 'OpenAI');
    }

    /**
     * Get organization's Anthropic API key (AES-256-GCM decrypted).
     * Stored in the `anthropic_api_key` column (added by migration).
     */
    async getOrganizationAnthropicKey(organizationId) {
        return this._getOrgKey(organizationId, 'anthropic_api_key', 'Anthropic');
    }

    /**
     * Get organization's Google Gemini API key (AES-256-GCM decrypted).
     * Stored in the `gemini_api_key` column.
     */
    async getOrganizationGeminiKey(organizationId) {
        return this._getOrgKey(organizationId, 'gemini_api_key', 'Gemini');
    }

    /**
     * Internal — fetch and decrypt a named key column for an org.
     */
    async _getOrgKey(organizationId, column, providerLabel) {
        const { data, error } = await supabaseAdmin
            .from('organizations')
            .select(`${column}, subscription_status`)
            .eq('id', organizationId)
            .single();

        if (error) throw new Error('Failed to fetch organization details');

        if (data.subscription_status === 'pending') {
            throw new Error('Organization awaiting approval');
        }
        if (['suspended', 'banned'].includes(data.subscription_status)) {
            throw new Error('Organization access suspended');
        }
        if (!data[column]) {
            throw new Error(`Organization ${providerLabel} API key not configured`);
        }

        try {
            const raw = data[column];
            if (encryptionService.isEncrypted(raw)) {
                return encryptionService.decrypt(raw);
            }
            logger.warn(`Org ${organizationId} has unencrypted ${providerLabel} key — migrate to encrypted storage`, 'PROXY');
            return raw;
        } catch (decryptError) {
            throw new Error(`Failed to decrypt organization ${providerLabel} API key`);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Proxy key validation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Validate a SpendAI proxy key and return the key record.
     * Separating this from proxyChatCompletion allows the route to call it
     * early (for budget guard) and pass the result back to avoid a double lookup.
     *
     * @param {string} proxyKey
     * @returns {Object} key data { organization_id, project_id, id }
     */
    async validateProxyKey(proxyKey) {
        const keyValidation = await proxyKeyService.verifyProxyKey(proxyKey);
        if (!keyValidation.success || !keyValidation.key) {
            throw new Error('Invalid or revoked proxy key');
        }
        return keyValidation.key;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Header building
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Build whitelisted headers for an OpenAI request.
     */
    buildOpenAIHeaders(requestHeaders, apiKey) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };
        const safeHeaders = ['accept', 'user-agent'];
        for (const h of safeHeaders) {
            if (requestHeaders[h]) {
                const name = h.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('-');
                headers[name] = requestHeaders[h];
            }
        }
        return headers;
    }

    /**
     * Build whitelisted headers for an Anthropic request.
     * Anthropic uses x-api-key instead of Authorization: Bearer.
     */
    buildAnthropicHeaders(apiKey) {
        return {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Anthropic format conversion
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Convert OpenAI-format messages array to Anthropic format.
     *
     * OpenAI:    [{ role: 'system', content: '...' }, { role: 'user', content: '...' }]
     * Anthropic: { system: '...', messages: [{ role: 'user', content: '...' }] }
     */
    _toAnthropicMessages(messages) {
        let systemPrompt = null;
        const anthropicMessages = [];

        for (const msg of messages) {
            if (msg.role === 'system') {
                systemPrompt = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
            } else {
                anthropicMessages.push({
                    role: msg.role === 'assistant' ? 'assistant' : 'user',
                    content: typeof msg.content === 'string'
                        ? msg.content
                        : msg.content  // already array format — pass through
                });
            }
        }

        return { systemPrompt, messages: anthropicMessages };
    }

    /**
     * Convert Anthropic Messages API response to OpenAI-compatible format.
     * Allows the client to use a single response parser for both providers.
     */
    _fromAnthropicResponse(anthropicResp, model, requestId) {
        const content = anthropicResp.content?.[0];
        const text = content?.text ?? '';

        return {
            id: anthropicResp.id || `chatcmpl-${requestId}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{
                index: 0,
                message: { role: 'assistant', content: text },
                finish_reason: anthropicResp.stop_reason || 'stop'
            }],
            usage: {
                prompt_tokens: anthropicResp.usage?.input_tokens ?? 0,
                completion_tokens: anthropicResp.usage?.output_tokens ?? 0,
                total_tokens: (anthropicResp.usage?.input_tokens ?? 0) +
                    (anthropicResp.usage?.output_tokens ?? 0)
            },
            // Keep original Anthropic response for debugging
            _anthropic_raw: anthropicResp
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Gemini format conversion
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Convert OpenAI messages to Gemini contents format
     */
    _toGeminiMessages(messages) {
        return messages.map(msg => {
            let role = msg.role;
            if (role === 'system') role = 'user'; // Gemini doesn't have a direct 'system' role in contents, often handled via system_instruction or by labeling as user
            if (role === 'assistant') role = 'model';

            return {
                role: role === 'model' ? 'model' : 'user',
                parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }]
            };
        });
    }

    /**
     * Convert Gemini response to OpenAI-compatible format
     */
    _fromGeminiResponse(geminiResp, model, requestId) {
        const candidate = geminiResp.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text ?? '';

        return {
            id: `gemini-${requestId}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{
                index: 0,
                message: { role: 'assistant', content: text },
                finish_reason: candidate?.finishReason?.toLowerCase() || 'stop'
            }],
            usage: {
                prompt_tokens: geminiResp.usageMetadata?.promptTokenCount ?? 0,
                completion_tokens: geminiResp.usageMetadata?.candidatesTokenCount ?? 0,
                total_tokens: geminiResp.usageMetadata?.totalTokenCount ?? 0
            },
            _gemini_raw: geminiResp
        };
    }

    /**
     * Forward request to Google Gemini API
     */
    async forwardToGemini(model, requestBody, apiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Prepare Gemini body
        const geminiBody = {
            contents: this._toGeminiMessages(requestBody.messages || []),
            generationConfig: {
                temperature: requestBody.temperature,
                topP: requestBody.top_p,
                maxOutputTokens: requestBody.max_tokens,
                stopSequences: Array.isArray(requestBody.stop) ? requestBody.stop : (requestBody.stop ? [requestBody.stop] : [])
            }
        };

        // Handle System instruction if present
        const systemMsg = (requestBody.messages || []).find(m => m.role === 'system');
        if (systemMsg) {
            geminiBody.system_instruction = {
                parts: [{ text: systemMsg.content }]
            };
            // Also filter out system message from contents to avoid duplication if handled here
            geminiBody.contents = geminiBody.contents.filter((_, i) => requestBody.messages[i].role !== 'system');
        }

        const resp = await axios.post(url, geminiBody, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 90000,
            validateStatus: () => true
        });

        return resp;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core proxy method
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Proxy a chat completion request to either OpenAI or Anthropic.
     *
     * @param {string} proxyKey        - SpendAI proxy key
     * @param {Object} requestBody     - OpenAI-format chat completion body
     * @param {Object} requestHeaders  - Original client request headers
     * @param {string} [provider]      - Force 'openai' or 'anthropic'; auto-detects otherwise
     * @param {Object} [preValidatedKey] - Key data from prior validateProxyKey() call
     */
    async proxyChatCompletion(proxyKey, requestBody, requestHeaders = {}, provider = null, preValidatedKey = null) {
        const requestId = this.generateRequestId();

        try {
            // 1. Proxy key validation (skip if pre-validated in route budget guard)
            const keyData = preValidatedKey || await this.validateProxyKey(proxyKey);
            const { organization_id, project_id, id: keyId } = keyData;

            // 2. Model validation + provider detection
            const model = requestBody.model;
            const detectedProvider = provider || this.detectProvider(model);

            if (!detectedProvider) {
                const err = new Error(`Unknown model: ${model}`);
                err.code = 'INVALID_MODEL';
                throw err;
            }

            const modelValidation = this.validateModel(model);
            if (!modelValidation.valid) {
                const err = new Error(modelValidation.error);
                err.code = 'INVALID_MODEL';
                throw err;
            }

            let responseData;
            let statusCode;

            // ── OpenAI path ─────────────────────────────────────────────────
            if (detectedProvider === 'openai') {
                const apiKey = await this.getOrganizationOpenAIKey(organization_id);
                const url = 'https://api.openai.com/v1/chat/completions';
                const headers = this.buildOpenAIHeaders(requestHeaders, apiKey);

                const resp = await axios.post(url, requestBody, {
                    headers,
                    timeout: 90000,
                    validateStatus: () => true  // never throw on 4xx/5xx
                });

                statusCode = resp.status;
                responseData = resp.data;
            }

            // ── Anthropic path ───────────────────────────────────────────────
            else if (detectedProvider === 'anthropic') {
                const apiKey = await this.getOrganizationAnthropicKey(organization_id);
                const url = 'https://api.anthropic.com/v1/messages';
                const headers = this.buildAnthropicHeaders(apiKey);

                // Convert OpenAI message format → Anthropic
                const { systemPrompt, messages: anthropicMessages } = this._toAnthropicMessages(
                    requestBody.messages || []
                );

                const anthropicBody = {
                    model,
                    messages: anthropicMessages,
                    max_tokens: requestBody.max_tokens || 1024,
                    ...(systemPrompt ? { system: systemPrompt } : {}),
                    ...(requestBody.temperature !== undefined ? { temperature: requestBody.temperature } : {}),
                    ...(requestBody.top_p !== undefined ? { top_p: requestBody.top_p } : {}),
                    ...(requestBody.stop ? { stop_sequences: Array.isArray(requestBody.stop) ? requestBody.stop : [requestBody.stop] } : {})
                };

                const resp = await axios.post(url, anthropicBody, {
                    headers,
                    timeout: 90000,
                    validateStatus: () => true
                });

                statusCode = resp.status;

                // Convert Anthropic response → OpenAI-compatible format
                if (resp.status === 200) {
                    responseData = this._fromAnthropicResponse(resp.data, model, requestId);
                }
            }

            // ── Gemini path ──────────────────────────────────────────────────
            else if (detectedProvider === 'gemini') {
                const apiKey = await this.getOrganizationGeminiKey(organization_id);
                const resp = await this.forwardToGemini(model, requestBody, apiKey);

                statusCode = resp.status;

                if (resp.status === 200) {
                    responseData = this._fromGeminiResponse(resp.data, model, requestId);
                } else {
                    responseData = {
                        error: {
                            message: resp.data?.[0]?.error?.message || resp.data?.error?.message || 'Gemini API error',
                            type: 'api_error',
                            code: 'gemini_error'
                        }
                    };
                }
            }

            // 3. Log usage on success (best-effort)
            if (statusCode === 200 && responseData?.usage) {
                try {
                    await usageLoggingService.logFromOpenAIResponse({
                        request_id: requestId,
                        organization_id,
                        project_id,
                        proxy_key_id: keyId,
                        openaiResponse: responseData,  // already in OpenAI format
                        provider: detectedProvider
                    });
                } catch (loggingError) {
                    logger.error(`[${requestId}] Usage logging failed: ${loggingError.message}`, 'PROXY');
                }
            }

            return {
                success: statusCode === 200,
                response: responseData,
                statusCode,
                metadata: {
                    spendai_request_id: requestId,
                    organization_id,
                    project_id,
                    proxy_key_id: keyId,
                    provider: detectedProvider,
                    model,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            logger.error(`[${requestId}] Proxy error: ${error.message}`, 'PROXY');

            if (error.code === 'INVALID_MODEL') throw error;
            if (error.code === 'ECONNABORTED') throw new Error('AI provider request timeout');
            if (error.message.includes('proxy key')) throw error;
            if (error.message.includes('decrypt')) throw new Error('Failed to decrypt organization API key');

            throw new Error('Proxy request failed');
        }
    }

    /**
     * Validate chat completion request body (OpenAI-format, used by route before routing).
     */
    validateChatCompletionRequest(body) {
        if (!body) return { valid: false, error: 'Request body is required' };
        if (!body.model) return { valid: false, error: 'model is required' };
        if (!body.messages || !Array.isArray(body.messages)) return { valid: false, error: 'messages must be an array' };
        if (body.messages.length === 0) return { valid: false, error: 'messages cannot be empty' };
        return { valid: true };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Legacy aliases (maintain backward compat)
    // ─────────────────────────────────────────────────────────────────────────
    getSupportedModels() {
        return [...this.getSupportedOpenAIModels(), ...this.getSupportedAnthropicModels(), ...this.getSupportedGeminiModels()];
    }
    buildForwardHeaders(requestHeaders, apiKey) {
        return this.buildOpenAIHeaders(requestHeaders, apiKey);
    }
    getOpenAIBaseURL() {
        return 'https://api.openai.com';
    }
}

async function forwardToGemini(requestBody, apiKey) {
    const model = requestBody.model;

    // Translate OpenAI messages → Gemini format
    const systemMessages = requestBody.messages
        .filter(m => m.role === 'system')
        .map(m => m.content)
        .join('\n');

    const contents = requestBody.messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

    const geminiBody = { contents };
    if (systemMessages) {
        geminiBody.systemInstruction = {
            parts: [{ text: systemMessages }]
        };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
        signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const status = response.status;
        if (status === 401) throw {
            status: 401,
            message: 'Invalid Google API key. Check your organization Settings.'
        };
        if (status === 429) throw {
            status: 429,
            message: 'Google API rate limit reached. Try again shortly.'
        };
        if (status === 400) throw {
            status: 400,
            message: err?.error?.message || 'Bad request to Google API.'
        };
        throw {
            status: 502,
            message: 'Google API error. Request could not be completed.'
        };
    }

    const data = await response.json();

    // Translate Gemini response → OpenAI format
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const usage = data.usageMetadata || {};

    return {
        choices: [{
            message: { role: 'assistant', content: text },
            finish_reason: 'stop',
            index: 0
        }],
        usage: {
            prompt_tokens: usage.promptTokenCount || 0,
            completion_tokens: usage.candidatesTokenCount || 0,
            total_tokens: usage.totalTokenCount || 0
        },
        model: model,
        object: 'chat.completion'
    };
}

async function forwardToGemini(requestBody, apiKey) {
    const model = requestBody.model;

    // Translate OpenAI messages → Gemini format
    const systemMessages = requestBody.messages
        .filter(m => m.role === 'system')
        .map(m => m.content)
        .join('\n');

    const contents = requestBody.messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

    const geminiBody = { contents };
    if (systemMessages) {
        geminiBody.systemInstruction = {
            parts: [{ text: systemMessages }]
        };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
        signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const status = response.status;
        if (status === 401) throw {
            status: 401,
            message: 'Invalid Google API key. Check your organization Settings.'
        };
        if (status === 429) throw {
            status: 429,
            message: 'Google API rate limit reached. Try again shortly.'
        };
        if (status === 400) throw {
            status: 400,
            message: err?.error?.message || 'Bad request to Google API.'
        };
        throw {
            status: 502,
            message: 'Google API error. Request could not be completed.'
        };
    }

    const data = await response.json();

    // Translate Gemini response → OpenAI format
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const usage = data.usageMetadata || {};

    return {
        choices: [{
            message: { role: 'assistant', content: text },
            finish_reason: 'stop',
            index: 0
        }],
        usage: {
            prompt_tokens: usage.promptTokenCount || 0,
            completion_tokens: usage.candidatesTokenCount || 0,
            total_tokens: usage.totalTokenCount || 0
        },
        model: model,
        object: 'chat.completion'
    };
}

const service = new OpenAIProxyService();
service.forwardToGemini = forwardToGemini;
module.exports = service;
