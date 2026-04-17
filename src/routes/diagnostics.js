const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/subscription');

/**
 * GET /api/diagnostics/ping
 * Simple health check
 */
router.get('/ping', (req, res) => {
    res.json({ success: true, message: 'pong', timestamp: new Date().toISOString() });
});

/**
 * GET /api/diagnostics/health
 * Render healthcheck endpoint — lightweight, no DB call
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        node_version: process.version,
        environment: process.env.NODE_ENV || 'development'
    });
});

/**
 * All following routes require super admin protection
 */
router.use(authenticate);
router.use(requireSuperAdmin);

/**
 * GET /api/diagnostics/net-test
 * Tests raw outbound internet connectivity from the container
 */
router.get('/net-test', async (req, res) => {
    const tests = {};
    // Test 1: plain HTTP to known public endpoint
    try {
        const r1 = await fetch('https://httpbin.org/get');
        tests.httpbin = r1.ok ? 'ok' : `http_${r1.status}`;
    } catch (e) { tests.httpbin = `err: ${e?.message || String(e)}`; }

    // Test 2: Supabase domain DNS + TLS
    try {
        const r2 = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
            headers: { apikey: process.env.SUPABASE_ANON_KEY || 'x' }
        });
        tests.supabase = `http_${r2.status}`;
    } catch (e) { tests.supabase = `err: ${e?.message || String(e)}`; }

    res.json({ success: true, tests, node_version: process.version });
});

/**
 * GET /api/diagnostics/check-supabase
 * Tests the connection and service role permissions
 */
router.get('/check-supabase', async (req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';
    const anonKey = process.env.SUPABASE_ANON_KEY || '';

    const results = {
        supabase_url: !!supabaseUrl,
        supabase_url_preview: supabaseUrl.slice(0, 40),
        supabase_service_key: !!serviceKey,
        supabase_anon_key: !!anonKey,
        raw_fetch: false,
        sdk_connection: false,
        rls_bypass_check: false,
        error: null,
    };

    // ── Test 1: Raw HTTP fetch (bypasses SDK) ──────────────────────────────
    try {
        const rawRes = await fetch(`${supabaseUrl}/rest/v1/organizations?select=count`, {
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`,
            },
        });
        results.raw_fetch = rawRes.ok;
        if (!rawRes.ok) {
            const text = await rawRes.text();
            results.error = `Raw fetch HTTP ${rawRes.status}: ${text.slice(0, 200)}`;
        }
    } catch (rawErr) {
        results.error = `Raw fetch error: ${rawErr?.message || String(rawErr)}`;
        return res.status(500).json({ success: false, data: results });
    }

    // ── Test 2: Supabase JS SDK ────────────────────────────────────────────
    try {
        const { count, error } = await supabaseAdmin
            .from('organizations')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        results.sdk_connection = true;

        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('count')
            .limit(1);

        if (!userError) {
            results.rls_bypass_check = true;
        } else {
            results.error = `User select failed: ${userError.message}`;
        }

        res.json({ success: true, data: results });
    } catch (err) {
        results.error = err?.message || JSON.stringify(err) || 'Unknown SDK error';
        res.status(500).json({ success: false, data: results });
    }
});

/**
 * POST /api/diagnostics/test-email
 * Sends a test email to verify delivery
 */
router.post('/test-email', async (req, res) => {
    try {
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        const result = await resend.emails.send({
            from: 'SpendAI <onboarding@resend.dev>',
            to: req.body.email || process.env.ADMIN_ALERT_EMAIL,
            subject: 'SpendAI Test Email',
            html: `
                <div style="background:#080809;color:#f0f0ee;padding:40px;font-family:system-ui">
                    <h2 style="color:#5b6af7">SpendAI</h2>
                    <p>Email delivery is working correctly.</p>
                    <p style="font-size:12px;color:#666">Timestamp: ${new Date().toISOString()}</p>
                </div>
            `
        });
        res.json({ success: true, id: result.id });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
