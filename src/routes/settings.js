const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const encryptionService = require('../services/encryptionService');
const { supabaseAdmin } = require('../config/supabase');
const logger = require('../config/logger');
const axios = require('axios');

router.use(authenticate);

/**
 * Helper: Get org record by organization ID
 */
async function getOrgById(orgId) {
    const { data: org, error } = await supabaseAdmin
        .from('organizations')
        .select('openai_api_key, anthropic_api_key, google_api_key')
        .eq('id', orgId)
        .single();
    if (error) throw new Error(`Failed to fetch org: ${error.message}`);
    return org;
}

/**
 * Helper: Check if a value is already encrypted (AES-256-GCM format: iv:authTag:ciphertext)
 * Raw API keys start with known prefixes (sk-, sk-ant-, AIza) and are short.
 * Encrypted values are long hex strings with two colons.
 */
function isAlreadyEncrypted(value) {
    if (!value) return false;
    // Known plaintext prefixes — definitely NOT encrypted
    if (value.startsWith('sk-') || value.startsWith('sk-ant-') || value.startsWith('AIza')) {
        return false;
    }
    // Our encrypted format is "hexIV:hexAuthTag:hexCiphertext" — all hex chars with exactly 2 colons
    const parts = value.split(':');
    return parts.length === 3 && value.length > 100;
}

/**
 * GET /api/settings/key-status
 * Returns which providers have a key configured (boolean only — never the key value)
 */
router.get('/key-status', async (req, res) => {
    try {
        const { data: org, error } = await supabaseAdmin
            .from('organizations')
            .select('openai_api_key, anthropic_api_key, google_api_key')
            .eq('id', req.user.organizationId || req.user.organization_id)
            .single();

        if (error) throw error;

        res.json({
            success: true,
            status: {
                openai: !!org.openai_api_key,
                anthropic: !!org.anthropic_api_key,
                google: !!org.google_api_key
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/settings/openai-key
 * Guard: prevent double-encryption if user saves the same (already encrypted) key
 */
router.put('/openai-key', requireAdmin, async (req, res) => {
    try {
        const { apiKey } = req.body;
        const encrypted = isAlreadyEncrypted(apiKey) ? apiKey : encryptionService.encrypt(apiKey);

        const { error } = await supabaseAdmin
            .from('organizations')
            .update({ openai_api_key: encrypted })
            .eq('id', req.user.organizationId);

        if (error) throw error;
        res.json({ success: true, message: 'OpenAI API key saved' });
    } catch (error) {
        logger.error(`Error saving OpenAI key: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/settings/anthropic-key
 * Guard: prevent double-encryption
 */
router.put('/anthropic-key', requireAdmin, async (req, res) => {
    try {
        const { apiKey } = req.body;
        const encrypted = isAlreadyEncrypted(apiKey) ? apiKey : encryptionService.encrypt(apiKey);

        const { error } = await supabaseAdmin
            .from('organizations')
            .update({ anthropic_api_key: encrypted })
            .eq('id', req.user.organizationId);

        if (error) throw error;
        res.json({ success: true, message: 'Anthropic API key saved' });
    } catch (error) {
        logger.error(`Error saving Anthropic key: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/settings/google-key
 * Guard: prevent double-encryption
 */
router.put('/google-key', requireAdmin, async (req, res) => {
    try {
        const { apiKey } = req.body;
        const encrypted = isAlreadyEncrypted(apiKey) ? apiKey : encryptionService.encrypt(apiKey);

        const { error } = await supabaseAdmin
            .from('organizations')
            .update({ google_api_key: encrypted })
            .eq('id', req.user.organizationId);

        if (error) throw error;
        res.json({ success: true, message: 'Google API key saved' });
    } catch (error) {
        logger.error(`Error saving Google key: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/settings/test-openai-key
 * Tests the provided OpenAI API key with a minimal chat completion
 */
router.post('/test-openai-key', requireAdmin, async (req, res) => {
    try {
        const { apiKey } = req.body;
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Say hello' }],
            max_tokens: 5
        }, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            timeout: 10000
        });
        res.json({ success: true, message: 'Connection successful' });
    } catch (error) {
        res.status(400).json({ success: false, error: 'Invalid API key or connection failed' });
    }
});

/**
 * POST /api/settings/test-anthropic-key
 * Tests the provided Anthropic API key with a minimal messages request
 */
router.post('/test-anthropic-key', requireAdmin, async (req, res) => {
    try {
        const { apiKey } = req.body;
        if (!apiKey) {
            return res.status(400).json({ success: false, error: 'API key is required' });
        }

        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            {
                model: 'claude-3-haiku-20240307',
                max_tokens: 10,
                messages: [{ role: 'user', content: 'Hi' }]
            },
            {
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                },
                timeout: 10000
            }
        );

        res.json({ success: true, message: 'Anthropic key is valid' });
    } catch (error) {
        const errMsg = error.response?.data?.error?.message || 'Invalid Anthropic API key or connection failed';
        logger.error(`Anthropic key test failed: ${errMsg}`);
        res.status(400).json({ success: false, error: errMsg });
    }
});

/**
 * POST /api/settings/test-google-key
 * Tests the provided Google API key with a minimal Gemini generateContent request
 */
router.post('/test-google-key', requireAdmin, async (req, res) => {
    try {
        const { apiKey } = req.body;
        if (!apiKey) {
            return res.status(400).json({ success: false, error: 'API key is required' });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const response = await axios.post(
            url,
            {
                contents: [{ parts: [{ text: 'Hi' }] }]
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            }
        );

        res.json({ success: true, message: 'Google API key is valid' });
    } catch (error) {
        const errMsg = error.response?.data?.error?.message || 'Invalid Google API key or connection failed';
        logger.error(`Google key test failed: ${errMsg}`);
        res.status(400).json({ success: false, error: errMsg });
    }
});

/**
 * PUT /api/settings/org-profile
 */
router.put('/org-profile', requireAdmin, async (req, res) => {
    try {
        const { name, billing_email } = req.body;
        const { error } = await supabaseAdmin
            .from('organizations')
            .update({ name, billing_email })
            .eq('id', req.user.organizationId);

        if (error) throw error;
        res.json({ success: true, message: 'Profile updated' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/settings/profile
 * Update user's personal display name
 */
router.put('/profile', async (req, res) => {
    try {
        const { displayName } = req.body;
        const { error } = await supabaseAdmin
            .from('users')
            .update({ display_name: displayName })
            .eq('id', req.user.id);

        if (error) {
            // If display_name column doesn't exist yet, fail gracefully
            if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
                return res.json({ success: true, message: 'Display name noted (column pending migration)' });
            }
            throw error;
        }
        res.json({ success: true, message: 'Profile updated' });
    } catch (error) {
        logger.error(`Error updating user profile: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
