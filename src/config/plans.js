/**
 * Subscription Plan Configuration
 * Manual Billing - No payment gateway integration
 */

const plans = {
    free: {
        name: 'Free',
        displayName: 'Free Trial',
        price: 0,
        currency: 'USD',
        billingPeriod: 'lifetime',

        limits: {
            maxProjects: 3,
            maxUsers: 5,
            maxMonthlySpend: 100, // $100/month AI spend
            maxApiKeys: 3,
            dataRetentionDays: 30,
        },

        features: [
            'Up to 3 projects',
            'Up to 5 team members',
            '$100/month AI spend tracking',
            '30 days data retention',
            'Basic dashboard',
            'Email support'
        ],

        restrictions: {
            advancedAnalytics: false,
            budgetAlerts: false,
            apiAccess: false,
            customIntegrations: false,
            prioritySupport: false,
        }
    },

    starter: {
        name: 'Starter',
        displayName: 'Starter Plan',
        price: 49,
        currency: 'USD',
        billingPeriod: 'monthly',

        limits: {
            maxProjects: 10,
            maxUsers: 20,
            maxMonthlySpend: 1000,
            maxApiKeys: 10,
            dataRetentionDays: 90,
        },

        features: [
            'Up to 10 projects',
            'Up to 20 team members',
            '$1,000/month AI spend tracking',
            '90 days data retention',
            'Advanced analytics',
            'Budget alerts & notifications',
            'API access',
            'Priority email support',
            'Export reports (CSV/PDF)'
        ],

        restrictions: {
            advancedAnalytics: true,
            budgetAlerts: true,
            apiAccess: true,
            customIntegrations: false,
            prioritySupport: true,
        }
    },

    pro: {
        name: 'Pro',
        displayName: 'Professional Plan',
        price: 199,
        currency: 'USD',
        billingPeriod: 'monthly',

        limits: {
            maxProjects: 50,
            maxUsers: 100,
            maxMonthlySpend: null, // unlimited
            maxApiKeys: 50,
            dataRetentionDays: 365,
        },

        features: [
            'Up to 50 projects',
            'Up to 100 team members',
            'Unlimited AI spend tracking',
            '1 year data retention',
            'Advanced analytics & forecasting',
            'Real-time budget alerts',
            'Full API access',
            'Custom integrations',
            'Webhook support',
            'SSO (coming soon)',
            'Dedicated account manager',
            'Priority support (24/7)'
        ],

        restrictions: {
            advancedAnalytics: true,
            budgetAlerts: true,
            apiAccess: true,
            customIntegrations: true,
            prioritySupport: true,
        }
    },

    enterprise: {
        name: 'Enterprise',
        displayName: 'Enterprise Plan',
        price: null, // Custom pricing
        currency: 'USD',
        billingPeriod: 'custom',

        limits: {
            maxProjects: null, // unlimited
            maxUsers: null, // unlimited
            maxMonthlySpend: null, // unlimited
            maxApiKeys: null, // unlimited
            dataRetentionDays: null, // unlimited
        },

        features: [
            'Unlimited projects',
            'Unlimited team members',
            'Unlimited AI spend tracking',
            'Unlimited data retention',
            'Custom analytics & reporting',
            'Advanced budget controls',
            'Full API access',
            'Custom integrations',
            'Webhook support',
            'SSO & SAML',
            'On-premise deployment option',
            'Dedicated infrastructure',
            'SLA guarantee',
            'White-label option',
            'Dedicated support team'
        ],

        restrictions: {
            advancedAnalytics: true,
            budgetAlerts: true,
            apiAccess: true,
            customIntegrations: true,
            prioritySupport: true,
        }
    }
};

/**
 * Get plan details by tier
 */
function getPlan(tier) {
    return plans[tier] || plans.free;
}

/**
 * Check if organization can perform action based on plan
 */
function canPerformAction(planTier, action) {
    const plan = getPlan(planTier);
    return plan.restrictions[action] === true;
}

/**
 * Check if organization has reached limit
 */
function hasReachedLimit(planTier, limitType, currentValue) {
    const plan = getPlan(planTier);
    const limit = plan.limits[limitType];

    // null means unlimited
    if (limit === null) return false;

    return currentValue >= limit;
}

/**
 * Get all available plans for pricing page
 */
function getAllPlans() {
    return Object.keys(plans).map(tier => ({
        tier,
        ...plans[tier]
    }));
}

/**
 * Calculate prorated amount for plan upgrade
 */
function calculateProratedAmount(currentPlan, newPlan, daysRemaining, totalDays) {
    if (currentPlan === 'free' || !newPlan.price) return newPlan.price;

    const currentPlanPrice = plans[currentPlan].price || 0;
    const newPlanPrice = newPlan.price;

    // Credit for unused days of current plan
    const credit = (currentPlanPrice / totalDays) * daysRemaining;

    // Charge for new plan minus credit
    return Math.max(0, newPlanPrice - credit);
}

module.exports = {
    plans,
    getPlan,
    canPerformAction,
    hasReachedLimit,
    getAllPlans,
    calculateProratedAmount
};
