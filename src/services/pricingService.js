const logger = require('../config/logger');

/**
 * Pricing Service
 *
 * Maintains static pricing for OpenAI and Anthropic models.
 * Calculates USD cost based on token usage.
 *
 * Pricing as of February 2026 (update as needed)
 */
class PricingService {

    /**
     * Get pricing table for all supported models
     *
     * Prices are in USD per 1M tokens
     *
     * @returns {Object} Pricing table
     */
    getPricingTable() {
        return {
            // ── OpenAI GPT-3.5 Turbo ───────────────────────────────────────
            'gpt-3.5-turbo': { prompt: 0.50, completion: 1.50 },
            'gpt-3.5-turbo-0125': { prompt: 0.50, completion: 1.50 },
            'gpt-3.5-turbo-1106': { prompt: 1.00, completion: 2.00 },

            // ── OpenAI GPT-4 ───────────────────────────────────────────────
            'gpt-4': { prompt: 30.00, completion: 60.00 },
            'gpt-4-0613': { prompt: 30.00, completion: 60.00 },

            // ── OpenAI GPT-4 Turbo ─────────────────────────────────────────
            'gpt-4-turbo': { prompt: 10.00, completion: 30.00 },
            'gpt-4-turbo-preview': { prompt: 10.00, completion: 30.00 },

            // ── OpenAI GPT-4o ──────────────────────────────────────────────
            'gpt-4o': { prompt: 5.00, completion: 15.00 },
            'gpt-4o-2024-05-13': { prompt: 5.00, completion: 15.00 },
            'gpt-4o-2024-08-06': { prompt: 2.50, completion: 10.00 },
            'gpt-4o-mini': { prompt: 0.15, completion: 0.60 },

            // ── OpenAI Reasoning Models (o1, o3) ───────────────────────────
            'o1': { prompt: 15.00, completion: 60.00 },
            'o1-2024-12-17': { prompt: 15.00, completion: 60.00 },
            'o1-preview': { prompt: 15.00, completion: 60.00 },
            'o1-mini': { prompt: 3.00, completion: 12.00 },
            'o3-mini': { prompt: 1.10, completion: 4.40 },

            // ── Anthropic Claude 3.5 / 3.7 ─────────────────────────────────
            'claude-3-5-sonnet-20240620': { prompt: 3.00, completion: 15.00 },
            'claude-3-5-sonnet-20241022': { prompt: 3.00, completion: 15.00 },
            'claude-3-5-haiku-20241022': { prompt: 0.25, completion: 1.25 },
            'claude-3-7-sonnet-20250219': { prompt: 3.00, completion: 15.00 },

            // ── Anthropic Claude 3 ─────────────────────────────────────────
            'claude-3-opus-20240229': { prompt: 15.00, completion: 75.00 },
            'claude-3-sonnet-20240229': { prompt: 3.00, completion: 15.00 },
            'claude-3-haiku-20240307': { prompt: 0.25, completion: 1.25 },

            // ── Anthropic Claude 4.5 ───────────────────────────────────────
            'claude-opus-4-5': { prompt: 15.00, completion: 75.00 },
            'claude-sonnet-4-5': { prompt: 3.00, completion: 15.00 },

            // ── Google Gemini 2.0 ─────────────────────────────────────────
            'gemini-2.0-flash': { prompt: 0.10, completion: 0.40 },
            'gemini-2.0-flash-lite': { prompt: 0.075, completion: 0.30 },
            'gemini-2.0-pro-exp': { prompt: 0.00, completion: 0.00 }, // Free experimental

            // ── Google Gemini 1.5 ─────────────────────────────────────────
            'gemini-1.5-pro': { prompt: 1.25, completion: 5.00 },
            'gemini-1.5-flash': { prompt: 0.075, completion: 0.30 },
            'gemini-1.5-flash-8b': { prompt: 0.0375, completion: 0.15 },

            // ── Google Gemini 2.5 ─────────────────────────────────────────
            'gemini-2.5-pro-preview-03-25': { prompt: 1.25, completion: 10.00 },
            'gemini-2.5-pro': { prompt: 1.25, completion: 10.00 },
            'gemini-2.5-flash': { prompt: 0.15, completion: 0.60 }
        };
    }

    /**
     * Get pricing for a specific model
     *
     * @param {string} model - Model name
     * @returns {Object|null} Pricing object {prompt, completion} or null
     */
    getModelPricing(model) {
        const pricingTable = this.getPricingTable();
        return pricingTable[model] || null;
    }

    /**
     * Calculate cost in USD for a request
     *
     * Formula:
     *   prompt_cost = (prompt_tokens / 1,000,000) * price_per_1M_prompt_tokens
     *   completion_cost = (completion_tokens / 1,000,000) * price_per_1M_completion_tokens
     *   total_cost = prompt_cost + completion_cost
     *
     * @param {string} model - Model name
     * @param {number} promptTokens - Number of prompt tokens
     * @param {number} completionTokens - Number of completion tokens
     * @returns {number} Cost in USD (6 decimal places)
     */
    calculateCost(model, promptTokens, completionTokens) {
        const pricing = this.getModelPricing(model);

        if (!pricing) {
            logger.warn(`No pricing found for model: ${model}. Returning $0.00`, 'PRICING');
            return 0.00;
        }

        // Calculate cost per token type
        const promptCost = (promptTokens / 1_000_000) * pricing.prompt;
        const completionCost = (completionTokens / 1_000_000) * pricing.completion;

        // Total cost
        const totalCost = promptCost + completionCost;

        // Round to 6 decimal places for precision
        return Math.round(totalCost * 1_000_000) / 1_000_000;
    }

    /**
     * Get breakdown of cost calculation (for debugging/auditing)
     */
    getCostBreakdown(model, promptTokens, completionTokens) {
        const pricing = this.getModelPricing(model);

        if (!pricing) {
            return {
                model,
                error: 'No pricing found',
                total_cost_usd: 0.00
            };
        }

        const promptCost = (promptTokens / 1_000_000) * pricing.prompt;
        const completionCost = (completionTokens / 1_000_000) * pricing.completion;
        const totalCost = promptCost + completionCost;

        return {
            model,
            pricing: {
                prompt_per_1m: pricing.prompt,
                completion_per_1m: pricing.completion
            },
            usage: {
                prompt_tokens: promptTokens,
                completion_tokens: completionTokens,
                total_tokens: promptTokens + completionTokens
            },
            costs: {
                prompt_cost_usd: Math.round(promptCost * 1_000_000) / 1_000_000,
                completion_cost_usd: Math.round(completionCost * 1_000_000) / 1_000_000,
                total_cost_usd: Math.round(totalCost * 1_000_000) / 1_000_000
            }
        };
    }

    /**
     * Validate that pricing exists for a model
     */
    hasPricing(model) {
        return this.getModelPricing(model) !== null;
    }

    /**
     * Get all models with pricing
     */
    getSupportedModels() {
        return Object.keys(this.getPricingTable());
    }
}

module.exports = new PricingService();
