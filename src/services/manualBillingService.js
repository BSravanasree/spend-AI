/**
 * Manual Billing Service
 * Handles subscription management without payment gateway
 */

const { supabaseAdmin } = require('../config/supabase');
const { getPlan } = require('../config/plans');
const logger = require('../config/logger');

class ManualBillingService {
    /**
     * Approve a pending organization signup
     */
    async approveOrganization(organizationId, approvedByUserId, planTier = 'free', trialDays = 14) {
        try {
            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

            const plan = getPlan(planTier);

            // Update organization
            const { data: org, error: orgError } = await supabaseAdmin
                .from('organizations')
                .update({
                    subscription_status: 'trial',
                    plan_tier: planTier,
                    trial_ends_at: trialEndsAt.toISOString(),
                    max_projects: plan.limits.maxProjects,
                    max_users: plan.limits.maxUsers,
                    max_monthly_spend_usd: plan.limits.maxMonthlySpend,
                    approved_by: approvedByUserId,
                    approved_at: new Date().toISOString()
                })
                .eq('id', organizationId)
                .select()
                .single();

            if (orgError) throw orgError;

            // Log in subscription history
            await supabaseAdmin
                .from('subscription_history')
                .insert({
                    organization_id: organizationId,
                    action: 'approved',
                    old_status: 'pending',
                    new_status: 'trial',
                    new_plan_tier: planTier,
                    changed_by: approvedByUserId,
                    notes: `Organization approved with ${trialDays} day trial`
                });

            // Log admin action
            await this.logAdminAction(approvedByUserId, organizationId, 'approve_signup', 'organization', organizationId, {
                planTier,
                trialDays
            });

            return { success: true, organization: org };
        } catch (error) {
            logger.error(`Error approving organization: ${error.message}`, 'BILLING');
            return { success: false, error: error.message };
        }
    }

    /**
     * Activate paid subscription (after receiving payment)
     */
    async activateSubscription(organizationId, planTier, paymentDetails, activatedByUserId) {
        try {
            const plan = getPlan(planTier);

            const subscriptionStartsAt = new Date();
            const subscriptionEndsAt = new Date();
            subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1); // 1 month

            // Update organization
            const { data: org, error: orgError } = await supabaseAdmin
                .from('organizations')
                .update({
                    subscription_status: 'active',
                    plan_tier: planTier,
                    subscription_starts_at: subscriptionStartsAt.toISOString(),
                    subscription_ends_at: subscriptionEndsAt.toISOString(),
                    max_projects: plan.limits.maxProjects,
                    max_users: plan.limits.maxUsers,
                    max_monthly_spend_usd: plan.limits.maxMonthlySpend
                })
                .eq('id', organizationId)
                .select()
                .single();

            if (orgError) throw orgError;

            // Log in subscription history
            await supabaseAdmin
                .from('subscription_history')
                .insert({
                    organization_id: organizationId,
                    action: 'activated',
                    new_plan_tier: planTier,
                    new_status: 'active',
                    amount_paid_usd: paymentDetails.amount,
                    payment_method: paymentDetails.method,
                    payment_reference: paymentDetails.reference,
                    invoice_number: paymentDetails.invoiceNumber,
                    changed_by: activatedByUserId,
                    notes: paymentDetails.notes
                });

            // Log admin action
            await this.logAdminAction(activatedByUserId, organizationId, 'activate_subscription', 'organization', organizationId, {
                planTier,
                amount: paymentDetails.amount
            });

            return { success: true, organization: org };
        } catch (error) {
            logger.error(`Error activating subscription: ${error.message}`, 'BILLING');
            return { success: false, error: error.message };
        }
    }

    /**
     * Create an invoice
     */
    async createInvoice(organizationId, planTier, billingPeriodStart, billingPeriodEnd, createdByUserId) {
        try {
            const plan = getPlan(planTier);

            // Generate invoice number (format: INV-YYYYMM-XXXXX)
            const invoiceNumber = await this.generateInvoiceNumber();

            const { data: invoice, error } = await supabaseAdmin
                .from('invoices')
                .insert({
                    organization_id: organizationId,
                    invoice_number: invoiceNumber,
                    amount_usd: plan.price,
                    plan_tier: planTier,
                    billing_period_start: billingPeriodStart,
                    billing_period_end: billingPeriodEnd,
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;

            // Log admin action
            await this.logAdminAction(createdByUserId, organizationId, 'create_invoice', 'invoice', invoice.id, {
                invoiceNumber,
                amount: plan.price
            });

            return { success: true, invoice };
        } catch (error) {
            logger.error(`Error creating invoice: ${error.message}`, 'BILLING');
            return { success: false, error: error.message };
        }
    }

    /**
     * Mark invoice as paid
     */
    async markInvoicePaid(invoiceId, paymentDetails, markedByUserId) {
        try {
            const { data: invoice, error } = await supabaseAdmin
                .from('invoices')
                .update({
                    status: 'paid',
                    paid_at: new Date().toISOString(),
                    payment_method: paymentDetails.method,
                    payment_reference: paymentDetails.reference,
                    notes: paymentDetails.notes
                })
                .eq('id', invoiceId)
                .select()
                .single();

            if (error) throw error;

            // Activate/renew subscription
            await this.activateSubscription(
                invoice.organization_id,
                invoice.plan_tier,
                {
                    amount: invoice.amount_usd,
                    method: paymentDetails.method,
                    reference: paymentDetails.reference,
                    invoiceNumber: invoice.invoice_number,
                    notes: paymentDetails.notes
                },
                markedByUserId
            );

            // Log admin action
            await this.logAdminAction(markedByUserId, invoice.organization_id, 'mark_invoice_paid', 'invoice', invoiceId, {
                amount: invoice.amount_usd,
                paymentReference: paymentDetails.reference
            });

            return { success: true, invoice };
        } catch (error) {
            logger.error(`Error marking invoice as paid: ${error.message}`, 'BILLING');
            return { success: false, error: error.message };
        }
    }

    /**
     * Renew subscription (create new invoice)
     */
    async renewSubscription(organizationId, renewedByUserId) {
        try {
            // Get current organization
            const { data: org } = await supabaseAdmin
                .from('organizations')
                .select('plan_tier, subscription_ends_at')
                .eq('id', organizationId)
                .single();

            const billingPeriodStart = new Date(org.subscription_ends_at);
            const billingPeriodEnd = new Date(billingPeriodStart);
            billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);

            return await this.createInvoice(
                organizationId,
                org.plan_tier,
                billingPeriodStart.toISOString().split('T')[0],
                billingPeriodEnd.toISOString().split('T')[0],
                renewedByUserId
            );
        } catch (error) {
            logger.error(`Error renewing subscription: ${error.message}`, 'BILLING');
            return { success: false, error: error.message };
        }
    }

    /**
     * Expire subscription (when payment not received)
     */
    async expireSubscription(organizationId, expiredByUserId) {
        try {
            const { data: org, error } = await supabaseAdmin
                .from('organizations')
                .update({
                    subscription_status: 'expired',
                    plan_tier: 'free', // Downgrade to free
                    max_projects: 3,
                    max_users: 5,
                    max_monthly_spend_usd: 100
                })
                .eq('id', organizationId)
                .select()
                .single();

            if (error) throw error;

            // Log in subscription history
            await supabaseAdmin
                .from('subscription_history')
                .insert({
                    organization_id: organizationId,
                    action: 'expired',
                    old_status: 'active',
                    new_status: 'expired',
                    new_plan_tier: 'free',
                    changed_by: expiredByUserId,
                    notes: 'Subscription expired due to non-payment'
                });

            return { success: true, organization: org };
        } catch (error) {
            logger.error(`Error expiring subscription: ${error.message}`, 'BILLING');
            return { success: false, error: error.message };
        }
    }

    /**
     * Check and expire subscriptions (run daily via cron)
     */
    async checkExpiredSubscriptions() {
        try {
            const { data: expiredOrgs } = await supabaseAdmin
                .from('organizations')
                .select('id, name, subscription_ends_at')
                .eq('subscription_status', 'active')
                .lt('subscription_ends_at', new Date().toISOString());

            const results = [];
            for (const org of expiredOrgs || []) {
                const result = await this.expireSubscription(org.id, null);
                results.push({ organizationId: org.id, ...result });
            }

            return { success: true, expiredCount: results.length, results };
        } catch (error) {
            logger.error(`Error checking expired subscriptions: ${error.message}`, 'BILLING');
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate unique invoice number
     */
    async generateInvoiceNumber() {
        const prefix = 'INV';
        const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');

        // Get count of invoices this month
        const { count } = await supabaseAdmin
            .from('invoices')
            .select('id', { count: 'exact', head: true })
            .like('invoice_number', `${prefix}-${yearMonth}%`);

        const sequence = String((count || 0) + 1).padStart(5, '0');

        return `${prefix}-${yearMonth}-${sequence}`;
    }

    /**
     * Log admin action for audit trail
     */
    async logAdminAction(adminUserId, organizationId, actionType, entityType, entityId, details) {
        try {
            await supabaseAdmin
                .from('admin_actions')
                .insert({
                    admin_user_id: adminUserId,
                    organization_id: organizationId,
                    action_type: actionType,
                    entity_type: entityType,
                    entity_id: entityId,
                    details: details
                });
        } catch (error) {
            logger.error(`Error logging admin action: ${error.message}`, 'BILLING');
        }
    }

    /**
     * Get subscription status for organization
     */
    async getSubscriptionStatus(organizationId) {
        try {
            const { data: org, error } = await supabaseAdmin
                .from('organizations')
                .select('plan_tier, subscription_status, trial_ends_at, subscription_ends_at, max_projects, max_users')
                .eq('id', organizationId)
                .single();

            if (error) throw error;

            const now = new Date();
            const trialEndsAt = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
            const subscriptionEndsAt = org.subscription_ends_at ? new Date(org.subscription_ends_at) : null;

            return {
                success: true,
                subscription: {
                    ...org,
                    isTrialActive: trialEndsAt && trialEndsAt > now,
                    isSubscriptionActive: org.subscription_status === 'active' && subscriptionEndsAt && subscriptionEndsAt > now,
                    daysUntilExpiry: subscriptionEndsAt ? Math.ceil((subscriptionEndsAt - now) / (1000 * 60 * 60 * 24)) : null
                }
            };
        } catch (error) {
            logger.error(`Error getting subscription status: ${error.message}`, 'BILLING');
            return { success: false, error: error.message };
        }
    }
}

module.exports = new ManualBillingService();
