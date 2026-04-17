const { supabaseAdmin } = require('../config/supabase');
const alertService = require('./alertService');
const { sendBudgetAlertEmail } = require('./emailService');
const logger = require('../config/logger');

/**
 * Budget Service
 *
 * Manages spend limits and threshold tracking for organizations and projects.
 * Integrates with usage logs to calculate real-time Month-to-Date (MTD) utilization.
 * Sends email alerts at 80% (warning) and 100% (critical) thresholds.
 */
class BudgetService {

    /**
     * Get organization budget and MTD spend
     */
    async getOrgBudget(organizationId) {
        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .select('monthly_budget_usd')
            .eq('id', organizationId)
            .single();

        if (orgError) throw orgError;

        const mtdSpend = await this.calculateMTDSpend(organizationId);

        return {
            budget: org.monthly_budget_usd,
            actual_spend: mtdSpend
        };
    }

    /**
     * Update organization budget
     */
    async updateOrgBudget(organizationId, budgetAmount) {
        const { data, error } = await supabaseAdmin
            .from('organizations')
            .update({ monthly_budget_usd: budgetAmount })
            .eq('id', organizationId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Get project budget and MTD spend
     */
    async getProjectBudget(projectId) {
        const { data: project, error: pError } = await supabaseAdmin
            .from('projects')
            .select('monthly_budget_usd, organization_id')
            .eq('id', projectId)
            .single();

        if (pError) throw pError;

        const mtdSpend = await this.calculateMTDSpend(project.organization_id, projectId);

        return {
            budget: project.monthly_budget_usd,
            actual_spend: mtdSpend
        };
    }

    /**
     * Update project budget
     */
    async updateProjectBudget(projectId, budgetAmount) {
        const { data, error } = await supabaseAdmin
            .from('projects')
            .update({ monthly_budget_usd: budgetAmount })
            .eq('id', projectId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Calculate MTD Spend from usage_logs
     *
     * @param {string} organizationId
     * @param {string|null} projectId  — scope to a project when provided
     */
    async calculateMTDSpend(organizationId, projectId = null) {
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

        let query = supabaseAdmin
            .from('usage_logs')
            .select('cost_usd')
            .eq('organization_id', organizationId)
            .gte('created_at', startOfMonth);

        if (projectId) {
            query = query.eq('project_id', projectId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const total = data.reduce((acc, row) => acc + parseFloat(row.cost_usd || 0), 0);
        return Math.round(total * 1000000) / 1000000;
    }

    /**
     * Check for budget threshold crossings and trigger alerts + emails.
     * Called after each successful usage log entry (fire-and-forget).
     *
     * @param {string} organizationId
     * @param {string} projectId
     */
    async checkBudgets(organizationId, projectId) {
        try {
            // 1. Org-level budget check
            const orgData = await this.getOrgBudget(organizationId);
            if (orgData.budget > 0) {
                await this.evaluateThresholds({
                    organization_id: organizationId,
                    project_id: null,
                    alert_level: 'organization',
                    budget: orgData.budget,
                    actual: orgData.actual_spend
                });
            }

            // 2. Project-level budget check
            const projectData = await this.getProjectBudget(projectId);
            if (projectData.budget > 0) {
                await this.evaluateThresholds({
                    organization_id: organizationId,
                    project_id: projectId,
                    alert_level: 'project',
                    budget: projectData.budget,
                    actual: projectData.actual_spend
                });
            }
        } catch (error) {
            logger.error(`Budget check processing failed: ${error.message}`, 'BUDGET');
        }
    }

    /**
     * Evaluate actual vs budget thresholds.
     * Triggers DB alert record + sends email for thresholds: 50, 75, 80, 90, 100.
     * Email is only sent for 80% and 100% crossing (warning + critical).
     * Dedup is enforced by the alerts table unique constraint (one per threshold/month).
     */
    async evaluateThresholds(params) {
        const { budget, actual, organization_id, project_id, alert_level } = params;

        // Thresholds checked from highest to lowest — emit for the highest crossed
        const thresholds = [100, 90, 80, 75, 50];
        const percentUsed = (actual / budget) * 100;
        const month_year = new Date().toISOString().substring(0, 7); // 'YYYY-MM'

        for (const t of thresholds) {
            if (percentUsed >= t) {
                // 1. Record alert in DB (unique constraint prevents duplicate per month)
                const alertResult = await alertService.recordAlert({
                    organization_id,
                    project_id,
                    alert_level,
                    threshold_percent: t,
                    budget_amount: budget,
                    actual_spend: actual
                });

                // Skip email if this alert was already sent this month
                if (alertResult.already_sent) {
                    logger.debug(`[Budget] Alert already recorded for ${organization_id} at ${t}% — skipping email`, 'BUDGET');
                    break;
                }

                // 2. Send email only at 80% and 100%
                if (t === 80 || t === 100) {
                    // Fetch org details for email context
                    const { data: orgData } = await supabaseAdmin
                        .from('organizations')
                        .select('name, billing_email, admin_notes')
                        .eq('id', organization_id)
                        .single();

                    // Get org admin email(s)
                    const { data: adminUsers } = await supabaseAdmin
                        .from('users')
                        .select('email')
                        .eq('organization_id', organization_id)
                        .in('role', ['admin', 'owner']);

                    const recipients = [
                        ...(orgData?.billing_email ? [orgData.billing_email] : []),
                        ...(adminUsers || []).map(u => u.email)
                    ];
                    // Deduplicate email addresses
                    const uniqueRecipients = [...new Set(recipients)];

                    // Resolve project name if this is a project-level alert
                    let projectName = null;
                    if (project_id) {
                        const { data: proj } = await supabaseAdmin
                            .from('projects')
                            .select('name')
                            .eq('id', project_id)
                            .single();
                        projectName = proj?.name || null;
                    }

                    // Send to each admin (fire-and-forget, errors are swallowed in emailService)
                    for (const email of uniqueRecipients) {
                        await sendBudgetAlertEmail({
                            orgName: orgData?.name || organization_id,
                            recipientEmail: email,
                            projectName,
                            thresholdPercent: t,
                            currentSpend: actual,
                            budgetLimit: budget,
                            month: month_year
                        });
                    }

                    // 3. Mark email as sent in the alerts table (migration 009 adds email_sent column)
                    if (alertResult.data?.id) {
                        await supabaseAdmin
                            .from('alerts')
                            .update({ email_sent: true, email_sent_at: new Date().toISOString() })
                            .eq('id', alertResult.data.id);
                    }

                    logger.info(`[Budget] Alert email sent: org=${organization_id} threshold=${t}% spend=${actual}/${budget}`, 'BUDGET');
                }

                // Only process the highest crossed threshold per run
                break;
            }
        }
    }
}

module.exports = new BudgetService();
