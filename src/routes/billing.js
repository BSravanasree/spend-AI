/**
 * Billing Routes — Customer-facing billing overview & invoice history
 * Protected: requires authentication + active org status
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorizeStatus } = require('../middleware/authorizeStatus');
const { supabaseAdmin } = require('../config/supabase');
const logger = require('../config/logger');

// All billing routes require auth + active org
router.use(authenticate);
router.use(authorizeStatus);

/**
 * GET /api/billing/overview
 * Returns the org's plan, subscription status, spend limit, MTD spend, trial info
 */
router.get('/overview', async (req, res) => {
    try {
        const orgId = req.user.organization_id;

        // Fetch org details
        const { data: org, error: orgErr } = await supabaseAdmin
            .from('organizations')
            .select('name, plan_tier, subscription_status, max_monthly_spend_usd, monthly_budget_usd, trial_ends_at, created_at')
            .eq('id', orgId)
            .single();

        if (orgErr) throw orgErr;

        // Calculate MTD spend from usage_logs
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

        const { data: usageLogs, error: usageErr } = await supabaseAdmin
            .from('usage_logs')
            .select('cost_usd')
            .eq('organization_id', orgId)
            .gte('created_at', startOfMonth);

        if (usageErr) throw usageErr;

        const mtdSpend = usageLogs.reduce((sum, row) => sum + parseFloat(row.cost_usd || 0), 0);

        res.json({
            success: true,
            data: {
                org_name: org.name,
                plan_tier: org.plan_tier,
                subscription_status: org.subscription_status,
                max_monthly_spend_usd: org.max_monthly_spend_usd,
                monthly_budget_usd: org.monthly_budget_usd,
                trial_ends_at: org.trial_ends_at,
                mtd_spend: Math.round(mtdSpend * 10000) / 10000,
                member_since: org.created_at
            }
        });
    } catch (error) {
        logger.error(`Billing overview error: ${error.message}`, 'BILLING');
        res.status(500).json({ success: false, error: 'Failed to load billing overview' });
    }
});

/**
 * GET /api/billing/invoices
 * Returns invoices for the current user's organization
 */
router.get('/invoices', async (req, res) => {
    try {
        const orgId = req.user.organization_id;

        const { data: invoices, error } = await supabaseAdmin
            .from('invoices')
            .select('id, created_at, billing_period_start, billing_period_end, plan_tier, amount_usd, status, paid_at, notes')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        res.json({ success: true, data: invoices || [] });
    } catch (error) {
        logger.error(`Billing invoices error: ${error.message}`, 'BILLING');
        res.status(500).json({ success: false, error: 'Failed to load invoices' });
    }
});

/**
 * POST /api/billing/request-upgrade
 * Sends an upgrade request email to the platform admin and logs the action
 */
router.post('/request-upgrade', async (req, res) => {
    try {
        const { requestedPlan } = req.body;
        const orgId = req.user.organization_id || req.user.organizationId;
        const userId = req.user.id;

        if (!requestedPlan) {
            return res.status(400).json({ success: false, error: 'requestedPlan is required' });
        }

        // Fetch org name
        const { data: org, error: orgErr } = await supabaseAdmin
            .from('organizations')
            .select('name, plan_tier')
            .eq('id', orgId)
            .single();
        if (orgErr) throw orgErr;

        // Fetch requesting user's email
        const { data: userRec, error: userErr } = await supabaseAdmin
            .from('users')
            .select('email')
            .eq('id', userId)
            .single();
        if (userErr) throw userErr;

        const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'teja41627@gmail.com';
        const frontendUrl = process.env.FRONTEND_URL || 'https://spendai-2-0.vercel.app';

        // Send email via Resend
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        if (process.env.RESEND_API_KEY) {
            await resend.emails.send({
                from: 'SpendAI <onboarding@resend.dev>',
                to: adminEmail,
                subject: `Plan upgrade request — ${org.name}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <body style="background:#080809;color:#f0f0ee;font-family:system-ui,sans-serif;padding:40px;">
                      <div style="max-width:560px;margin:0 auto;background:#111;border:1px solid #222;border-radius:12px;padding:32px;">
                        <h2 style="color:#5b6af7;">SpendAI — Upgrade Request</h2>
                        <hr style="border:none;border-top:1px solid #222;margin:20px 0;">
                        <h3 style="color:#fff;">A customer wants to upgrade their plan</h3>
                        <div style="background:#1a1a1a;padding:16px;border-radius:8px;margin:24px 0;border:1px solid #333;">
                          <p style="color:#fff;margin:0 0 8px 0;"><strong>${org.name}</strong></p>
                          <p style="color:#888;margin:0;font-size:14px;">User: ${userRec.email}</p>
                          <p style="color:#888;margin:0;font-size:14px;">Current plan: ${org.plan_tier}</p>
                          <p style="color:#10b981;margin:8px 0 0 0;font-size:14px;font-weight:600;">Requested plan: ${requestedPlan}</p>
                        </div>
                        <a href="${frontendUrl}/admin" style="display:inline-block;background:#5b6af7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Go to Admin Panel</a>
                        <hr style="border:none;border-top:1px solid #222;margin:20px 0;">
                        <p style="color:#555;font-size:12px;">SpendAI · AI API Cost Control</p>
                      </div>
                    </body>
                    </html>
                `
            });
        }

        logger.info(`Upgrade request: org=${org.name}, plan=${requestedPlan}, user=${userRec.email}`, 'BILLING');

        res.json({
            success: true,
            message: `Upgrade request for ${requestedPlan} sent. We'll contact you at ${userRec.email} within 24 hours.`
        });
    } catch (error) {
        logger.error(`Upgrade request error: ${error.message}`, 'BILLING');
        res.status(500).json({ success: false, error: 'Failed to send upgrade request' });
    }
});

module.exports = router;

