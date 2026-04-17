const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const authService = require('../services/authService');
const logger = require('../config/logger');
const router = express.Router();

/**
 * POST /api/auth/google-callback
 *
 * Called by the frontend after Supabase Google OAuth completes.
 * Receives the Supabase access_token, verifies it via authService.verifyToken
 * (which has JIT provisioning built-in), and returns a session object
 * identical to the /login response shape so the frontend can store it.
 */
router.post('/google-callback', async (req, res) => {
    try {
        const { accessToken } = req.body;

        if (!accessToken) {
            return res.status(400).json({ success: false, error: 'accessToken is required' });
        }

        // verifyToken handles JIT provisioning: creates user + org if they don't exist
        const result = await authService.verifyToken(accessToken);

        // Fetch org details with status + plan for the frontend
        const { data: orgData } = await supabaseAdmin
            .from('organizations')
            .select('id, name, subscription_status, plan_tier')
            .eq('id', result.user.organization?.id || result.user.organizationId)
            .single();

        return res.status(200).json({
            success: true,
            session: {
                accessToken,  // Re-use the Supabase token — it's already what we verify
                expiresAt: null
            },
            user: {
                id: result.user.id,
                email: result.user.email,
                role: result.user.role,
                organizationId: result.user.organizationId,
            },
            organization: orgData || result.user.organization || null,
        });

    } catch (err) {
        logger.error(`Google callback error: ${err.message}`, 'AUTH');
        return res.status(500).json({
            success: false,
            error: err.message || 'OAuth callback failed'
        });
    }
});

module.exports = router;
