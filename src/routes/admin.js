/**
 * Admin Routes - Manual Billing Management
 * Protected routes for super admins to manage subscriptions
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/subscription');
const manualBillingService = require('../services/manualBillingService');
const { supabaseAdmin } = require('../config/supabase');
const { getAllPlans } = require('../config/plans');
const { sendApprovalEmail } = require('../services/emailService');
const logger = require('../config/logger');

// All admin routes require authentication and super admin role
router.use(authenticate);
router.use(requireSuperAdmin);

/**
 * GET /api/admin/dashboard
 * Get admin dashboard metrics
 */
router.get('/dashboard', async (req, res) => {
    try {
        // Total organizations
        const { count: totalOrgs } = await supabaseAdmin
            .from('organizations')
            .select('id', { count: 'exact', head: true });

        // Organizations by status
        const { data: orgsByStatus } = await supabaseAdmin
            .from('organizations')
            .select('subscription_status');

        const statusCounts = orgsByStatus.reduce((acc, org) => {
            acc[org.subscription_status] = (acc[org.subscription_status] || 0) + 1;
            return acc;
        }, {});

        // Organizations by plan
        const { data: orgsByPlan } = await supabaseAdmin
            .from('organizations')
            .select('plan_tier');

        const planCounts = orgsByPlan.reduce((acc, org) => {
            acc[org.plan_tier] = (acc[org.plan_tier] || 0) + 1;
            return acc;
        }, {});

        // Recent signups (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: recentSignups } = await supabaseAdmin
            .from('organizations')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', thirtyDaysAgo.toISOString());

        // Pending approvals
        const { count: pendingApprovals } = await supabaseAdmin
            .from('organizations')
            .select('id', { count: 'exact', head: true })
            .eq('subscription_status', 'pending');

        // Total revenue (from paid invoices)
        const { data: paidInvoices } = await supabaseAdmin
            .from('invoices')
            .select('amount_usd')
            .eq('status', 'paid');

        const totalRevenue = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount_usd || 0), 0);

        // MRR (Monthly Recurring Revenue)
        const { data: activeOrgs } = await supabaseAdmin
            .from('organizations')
            .select('plan_tier')
            .eq('subscription_status', 'active');

        const plans = getAllPlans();
        const mrr = activeOrgs.reduce((sum, org) => {
            const plan = plans.find(p => p.tier === org.plan_tier);
            return sum + (plan?.price || 0);
        }, 0);

        res.json({
            success: true,
            metrics: {
                totalOrganizations: totalOrgs,
                pendingApprovals,
                recentSignups,
                totalRevenue: totalRevenue.toFixed(2),
                mrr: mrr.toFixed(2),
                statusBreakdown: statusCounts,
                planBreakdown: planCounts
            }
        });
    } catch (error) {
        logger.error(`Error fetching admin dashboard: ${error.message}`, 'ADMIN');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/admin/organizations
 * List all organizations with filters
 */
router.get('/organizations', async (req, res) => {
    try {
        const { status, plan, search, page = 1, limit = 50 } = req.query;

        let query = supabaseAdmin
            .from('organizations')
            .select('*', { count: 'exact' });

        // Apply filters
        if (status) {
            query = query.eq('subscription_status', status);
        }

        if (plan) {
            query = query.eq('plan_tier', plan);
        }

        if (search) {
            query = query.or(`name.ilike.%${search}%,billing_email.ilike.%${search}%`);
        }

        // Pagination
        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1);

        // Order by created_at desc
        query = query.order('created_at', { ascending: false });

        const { data: organizations, error, count } = await query;

        if (error) throw error;

        // Fetch owner email separately for each org to avoid ambiguous FK join
        const orgIds = organizations.map(o => o.id);
        const { data: owners } = await supabaseAdmin
            .from('users')
            .select('organization_id, email, role')
            .in('organization_id', orgIds)
            .in('role', ['owner', 'admin'])
            .order('created_at', { ascending: true });

        const ownersByOrg = (owners || []).reduce((acc, u) => {
            if (!acc[u.organization_id]) acc[u.organization_id] = u;
            return acc;
        }, {});

        const orgsWithOwners = organizations.map(org => ({
            ...org,
            owner: ownersByOrg[org.id] || null
        }));

        res.json({
            success: true,
            organizations: orgsWithOwners,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        logger.error(`Error fetching organizations: ${error.message}`, 'ADMIN');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/admin/organizations/:id
 * Get organization details
 */
router.get('/organizations/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: org, error } = await supabaseAdmin
            .from('organizations')
            .select(`
        *,
        projects(id, name, created_at),
        subscription_history(*)
      `)
            .eq('id', id)
            .single();

        if (error) throw error;

        // Fetch users separately to avoid ambiguous FK relationship error
        const { data: orgUsers } = await supabaseAdmin
            .from('users')
            .select('id, email, role, created_at')
            .eq('organization_id', id)
            .order('created_at', { ascending: true });

        // Get invoices
        const { data: invoices } = await supabaseAdmin
            .from('invoices')
            .select('*')
            .eq('organization_id', id)
            .order('created_at', { ascending: false });

        // Get usage stats
        const { data: usageLogs } = await supabaseAdmin
            .from('usage_logs')
            .select('cost_usd, created_at')
            .eq('organization_id', id)
            .order('created_at', { ascending: false })
            .limit(100);

        const totalSpend = (usageLogs || []).reduce((sum, log) => sum + parseFloat(log.cost_usd || 0), 0);

        res.json({
            success: true,
            organization: {
                ...org,
                users: orgUsers || [],
                invoices: invoices || [],
                totalSpend: totalSpend.toFixed(2)
            }
        });
    } catch (error) {
        logger.error(`Error fetching organization: ${error.message}`, 'ADMIN');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

const encryptionService = require('../services/encryptionService');

/**
 * PUT /api/admin/organizations/:id/keys
 * Update OpenAI and Anthropic API keys (Super Admin only)
 * Keys are encrypted before storage.
 */
router.put('/organizations/:id/keys', async (req, res) => {
    try {
        const { id } = req.params;
        const { openai_api_key, anthropic_api_key } = req.body;

        const updates = {};

        if (openai_api_key !== undefined) {
            updates.openai_api_key = openai_api_key ? encryptionService.encrypt(openai_api_key) : null;
        }

        if (anthropic_api_key !== undefined) {
            updates.anthropic_api_key = anthropic_api_key ? encryptionService.encrypt(anthropic_api_key) : null;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, error: 'No keys provided' });
        }

        const { error } = await supabaseAdmin
            .from('organizations')
            .update(updates)
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: 'API keys updated successfully'
        });
    } catch (error) {
        logger.error(`Error updating org keys: ${error.message}`, 'ADMIN');
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/organizations/:id/approve
 * Approve pending organization
 */
router.post('/organizations/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { planTier = 'free', trialDays = 14 } = req.body;

        const result = await manualBillingService.approveOrganization(
            id,
            req.user.id,
            planTier,
            trialDays
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        // Fire-and-forget: send approval email to org owner
        // Fetch the admin user's email for this org
        supabaseAdmin
            .from('users')
            .select('email')
            .eq('organization_id', id)
            .eq('role', 'admin')
            .limit(1)
            .single()
            .then(({ data: orgUser }) => {
                if (orgUser?.email) {
                    sendApprovalEmail(result.organization?.name || id, orgUser.email);
                }
            })
            .catch((err) => logger.error(`[Admin] Could not fetch org user for approval email: ${err.message}`, 'ADMIN'));

        res.json(result);
    } catch (error) {
        logger.error(`Error approving organization: ${error.message}`, 'ADMIN');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/admin/organizations/:id/activate
 * Activate paid subscription
 */
router.post('/organizations/:id/activate', async (req, res) => {
    try {
        const { id } = req.params;
        const { planTier, paymentDetails } = req.body;

        if (!paymentDetails || !paymentDetails.amount || !paymentDetails.method) {
            return res.status(400).json({
                success: false,
                error: 'Payment details required (amount, method, reference)'
            });
        }

        const result = await manualBillingService.activateSubscription(
            id,
            planTier,
            paymentDetails,
            req.user.id
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        logger.error(`Error activating subscription: ${error.message}`, 'ADMIN');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/admin/invoices
 * Create invoice for organization
 */
router.post('/invoices', async (req, res) => {
    try {
        const { organizationId, planTier, billingPeriodStart, billingPeriodEnd } = req.body;

        const result = await manualBillingService.createInvoice(
            organizationId,
            planTier,
            billingPeriodStart,
            billingPeriodEnd,
            req.user.id
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        logger.error(`Error creating invoice: ${error.message}`, 'ADMIN');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/admin/invoices/:id/mark-paid
 * Mark invoice as paid
 */
router.post('/invoices/:id/mark-paid', async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentDetails } = req.body;

        if (!paymentDetails || !paymentDetails.method) {
            return res.status(400).json({
                success: false,
                error: 'Payment details required (method, reference)'
            });
        }

        const result = await manualBillingService.markInvoicePaid(
            id,
            paymentDetails,
            req.user.id
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        logger.error(`Error marking invoice as paid: ${error.message}`, 'ADMIN');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/admin/invoices
 * List all invoices
 */
router.get('/invoices', async (req, res) => {
    try {
        const { status, page = 1, limit = 50 } = req.query;

        let query = supabaseAdmin
            .from('invoices')
            .select('*, organization:organizations(name)', { count: 'exact' });

        if (status) {
            query = query.eq('status', status);
        }

        const offset = (page - 1) * limit;
        query = query
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });

        const { data: invoices, error, count } = await query;

        if (error) throw error;

        res.json({
            success: true,
            invoices,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        logger.error(`Error fetching invoices: ${error.message}`, 'ADMIN');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/admin/organizations/:id/expire
 * Manually expire subscription
 */
router.post('/organizations/:id/expire', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await manualBillingService.expireSubscription(id, req.user.id);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        logger.error(`Error expiring subscription: ${error.message}`, 'ADMIN');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/admin/audit-log
 * Get admin action audit log
 */
router.get('/audit-log', async (req, res) => {
    try {
        const { page = 1, limit = 100 } = req.query;

        const offset = (page - 1) * limit;

        const { data: actions, error, count } = await supabaseAdmin
            .from('admin_actions')
            .select('*, admin:users!admin_user_id(email), organization:organizations(name)', { count: 'exact' })
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            actions,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        logger.error(`Error fetching audit log: ${error.message}`, 'ADMIN');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/admin/check-expired
 * Manually trigger expired subscription check
 */
router.post('/check-expired', async (req, res) => {
    try {
        const result = await manualBillingService.checkExpiredSubscriptions();
        res.json(result);
    } catch (error) {
        logger.error(`Error checking expired subscriptions: ${error.message}`, 'ADMIN');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
