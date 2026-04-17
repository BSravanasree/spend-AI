/**
 * Subscription Middleware
 *
 * ╔══════════════════════════════════════════════════════╗
 * ║  BETA MODE — All plan restrictions disabled          ║
 * ║  Every approved org gets unlimited access.           ║
 * ║  Original enforcement code is preserved below        ║
 * ║  in comments — restore when paid plans launch.       ║
 * ╚══════════════════════════════════════════════════════╝
 */

const { supabaseAdmin } = require('../config/supabase');
const { getPlan } = require('../config/plans');
const logger = require('../config/logger');

// ─── BETA: Shared unlimited subscription object ───────────────────────────
const BETA_SUBSCRIPTION = {
    status: 'active',
    plan: 'beta',
    maxProjects: 999,
    maxUsers: 999,
    maxApiKeys: 999,
    maxMonthlySpend: null   // null = unlimited
};

/**
 * requireActiveSubscription
 *
 * BETA: Allows all orgs that are not 'pending' or 'suspended'.
 * Previously blocked on expired trial / missing subscription_ends_at.
 */
async function requireActiveSubscription(req, res, next) {
    try {
        // Super admins are never blocked by subscription checks
        if (req.user?.role === 'super_admin') {
            logger.debug('[requireActiveSubscription] super_admin — bypassed', 'SUBSCRIPTION');
            req.organization = req.organization || {};
            req.subscription = BETA_SUBSCRIPTION;
            return next();
        }

        const organization_id = req.user.organizationId || req.user.organization_id;

        if (!organization_id) {
            logger.warn('[requireActiveSubscription] no organization_id on req.user — failing open', 'SUBSCRIPTION');
            req.organization = {};
            req.subscription = BETA_SUBSCRIPTION;
            return next();
        }

        const { data: org, error } = await supabaseAdmin
            .from('organizations')
            .select('subscription_status, plan_tier, trial_ends_at, subscription_ends_at')
            .eq('id', organization_id)
            .single();

        if (error) {
            logger.error(`[requireActiveSubscription] Supabase lookup error: ${error.message}. Org: ${organization_id}`, 'SUBSCRIPTION');
            throw error;
        }

        if (!org) {
            logger.warn(`[requireActiveSubscription] org ${organization_id} lookup returned no data — failing open`, 'SUBSCRIPTION');
            req.organization = {};
            req.subscription = BETA_SUBSCRIPTION;
            return next();
        }

        // Fix subscription expiry check: NULL ends_at means infinite
        const now = new Date();
        if (org.subscription_ends_at && new Date(org.subscription_ends_at) < now) {
            // Block truly expired orgs only if they're NOT in beta mode
            // Actually, for this prompt, let's block only truly expired ones.
            return res.status(402).json({
                success: false,
                error: 'Subscription expired',
                message: 'Your subscription has expired. Please upgrade or renew.'
            });
        }

        // Still block truly pending/suspended orgs
        if (org.subscription_status === 'pending') {
            return res.status(403).json({
                success: false,
                error: 'Account pending approval',
                code: 'PENDING_APPROVAL',
                message: 'Your account is awaiting admin approval.'
            });
        }

        if (org.subscription_status === 'suspended' || org.subscription_status === 'banned') {
            return res.status(403).json({
                success: false,
                error: 'Account suspended',
                code: 'ORG_SUSPENDED'
            });
        }

        // Success: Attach org and subscription info
        req.organization = org;
        req.subscription = { ...BETA_SUBSCRIPTION, plan: org.plan_tier || 'beta' };

        next();

    } catch (err) {
        logger.error(`[requireActiveSubscription] Check failed: ${err.message}. Failing open.`, 'SUBSCRIPTION');
        // Never block on lookup errors during Beta
        req.organization = req.organization || {};
        req.subscription = BETA_SUBSCRIPTION;
        return next();
    }
}

/**
 * checkProjectLimit
 *
 * BETA: Always passes. No project limits during beta.
 */
async function checkProjectLimit(req, res, next) {
    // BETA MODE: No project limits — pass through immediately
    logger.debug('[BETA] checkProjectLimit bypassed', 'SUBSCRIPTION');
    return next();

    /* ── ORIGINAL ENFORCEMENT (restore when billing launches) ──────────────
    try {
        const organization_id = req.user.organizationId || req.user.organization_id;
        const { plan_tier } = req.organization;

        const { count, error } = await supabaseAdmin
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organization_id)
            .eq('is_active', true);

        if (error) throw error;

        const plan = getPlan(plan_tier);

        if (hasReachedLimit(plan_tier, 'maxProjects', count)) {
            return res.status(403).json({
                success: false,
                error: 'Project limit reached',
                message: `Your ${plan.displayName} allows ${plan.limits.maxProjects} projects.`,
                currentCount: count,
                limit: plan.limits.maxProjects,
                upgradeRequired: true
            });
        }

        next();
    } catch (error) {
        logger.error(`Project limit check error: ${error.message}`, 'SUBSCRIPTION');
        res.status(500).json({ success: false, error: 'Failed to check project limit' });
    }
    ── END ORIGINAL ─────────────────────────────────────────────────────── */
}

/**
 * checkUserLimit
 *
 * BETA: Always passes. No user limits during beta.
 */
async function checkUserLimit(req, res, next) {
    // BETA MODE: No user limits — pass through immediately
    return next();

    /* ── ORIGINAL ENFORCEMENT ──────────────────────────────────────────────
    try {
        const organization_id = req.user.organizationId || req.user.organization_id;
        const { plan_tier } = req.organization;

        const { count, error } = await supabaseAdmin
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organization_id);

        if (error) throw error;

        const plan = getPlan(plan_tier);

        if (hasReachedLimit(plan_tier, 'maxUsers', count)) {
            return res.status(403).json({
                success: false,
                error: 'User limit reached',
                message: `Your ${plan.displayName} allows ${plan.limits.maxUsers} users.`,
                currentCount: count,
                limit: plan.limits.maxUsers,
                upgradeRequired: true
            });
        }

        next();
    } catch (error) {
        logger.error(`User limit check error: ${error.message}`, 'SUBSCRIPTION');
        res.status(500).json({ success: false, error: 'Failed to check user limit' });
    }
    ── END ORIGINAL ─────────────────────────────────────────────────────── */
}

/**
 * requireFeature
 *
 * BETA: All features available to everyone. Returns passthrough middleware.
 */
function requireFeature(featureName) {
    // BETA MODE: All features unlocked
    return (req, res, next) => {
        logger.debug(`[BETA] requireFeature(${featureName}) bypassed`, 'SUBSCRIPTION');
        next();
    };

    /* ── ORIGINAL ENFORCEMENT ──────────────────────────────────────────────
    return (req, res, next) => {
        const { plan_tier } = req.organization;
        if (!canPerformAction(plan_tier, featureName)) {
            const plan = getPlan(plan_tier);
            return res.status(403).json({
                success: false,
                error: 'Feature not available',
                message: `This feature requires a higher plan.`,
                feature: featureName,
                upgradeRequired: true
            });
        }
        next();
    };
    ── END ORIGINAL ─────────────────────────────────────────────────────── */
}

/**
 * checkSpendLimit
 *
 * BETA: Only enforces user-set budget (monthly_budget_usd).
 * Does NOT enforce plan-tier spend caps ($100, $1K, etc.).
 */
async function checkSpendLimit(req, res, next) {
    // BETA MODE: Skip plan-tier spend caps entirely
    // User-defined budget enforcement happens in the proxy route (openaiProxy.js)
    // via the preBudgetGuard — that reads monthly_budget_usd set by the user.
    return next();

    /* ── ORIGINAL ENFORCEMENT (plan-tier caps) ─────────────────────────────
    try {
        const organization_id = req.user.organizationId || req.user.organization_id;
        const { plan_tier, max_monthly_spend_usd } = req.organization;

        if (max_monthly_spend_usd === null) return next();

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: logs, error } = await supabaseAdmin
            .from('usage_logs')
            .select('cost_usd')
            .eq('organization_id', organization_id)
            .gte('created_at', startOfMonth.toISOString());

        if (error) throw error;

        const totalSpend = logs.reduce((sum, log) => sum + parseFloat(log.cost_usd || 0), 0);

        if (totalSpend >= max_monthly_spend_usd) {
            return res.status(403).json({
                success: false,
                error: 'Monthly spend limit reached',
                message: `You have reached your monthly spend limit of $${max_monthly_spend_usd}.`,
                upgradeRequired: true
            });
        }

        req.currentSpend = totalSpend;
        next();
    } catch (error) {
        logger.error(`Spend limit check error: ${error.message}`, 'SUBSCRIPTION');
        res.status(500).json({ success: false, error: 'Failed to check spend limit' });
    }
    ── END ORIGINAL ─────────────────────────────────────────────────────── */
}

/**
 * requireSuperAdmin
 * NOT changed — super admin check is security, not plan enforcement.
 */
async function requireSuperAdmin(req, res, next) {
    try {
        const { id: userId } = req.user;

        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        if (error) throw error;

        if (user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: 'Super admin access required',
                message: 'This action requires super admin privileges'
            });
        }

        next();
    } catch (error) {
        logger.error(`Super admin check error: ${error.message}`, 'AUTH');
        res.status(500).json({ success: false, error: 'Failed to verify admin status' });
    }
}

/**
 * attachSubscriptionInfo (non-blocking)
 * BETA: Attaches org info but always gives beta limits.
 */
async function attachSubscriptionInfo(req, res, next) {
    try {
        const organization_id = req.user.organizationId || req.user.organization_id;

        const { data: org } = await supabaseAdmin
            .from('organizations')
            .select('subscription_status, plan_tier, trial_ends_at, subscription_ends_at, max_projects, max_users, max_monthly_spend_usd')
            .eq('id', organization_id)
            .single();

        req.organization = org || {};
        // BETA: Always attach unlimited subscription regardless of actual plan
        req.subscription = { ...BETA_SUBSCRIPTION, plan: org?.plan_tier || 'beta' };
        next();
    } catch (error) {
        logger.error(`Error attaching subscription info: ${error.message}`, 'SUBSCRIPTION');
        req.organization = {};
        req.subscription = BETA_SUBSCRIPTION;
        next();
    }
}

module.exports = {
    requireActiveSubscription,
    checkProjectLimit,
    checkUserLimit,
    requireFeature,
    checkSpendLimit,
    requireSuperAdmin,
    attachSubscriptionInfo
};
