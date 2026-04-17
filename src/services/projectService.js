const { supabaseAdmin } = require('../config/supabase');
const logger = require('../config/logger');

class ProjectService {
    constructor() {
        this.supabase = supabaseAdmin;
    }

    /**
     * Create a new project
     * @param {string} organizationId - Organization ID
     * @param {string} userId - User ID creating the project
     * @param {string} name - Project name
     * @param {string} description - Project description (optional)
     * @param {number} monthlyBudget - Monthly budget in USD (optional)
     * @returns {Object} Created project
     */
    async createProject(organizationId, userId, name, description = '', monthlyBudget = 0) {
        try {
            // Primary attempt — include created_by
            const insertPayload = {
                organization_id: organizationId,
                name: name,
                description: description,
                monthly_budget_usd: monthlyBudget,
                created_by: userId
            };

            logger.info(`[ProjectService] Inserting project: org=${organizationId} name="${name}" created_by=${userId}`, 'PROJECTS');

            let { data, error } = await supabaseAdmin
                .from('projects')
                .insert(insertPayload)
                .select()
                .single();

            // If created_by causes a FK/constraint violation, retry without it
            if (error && (
                error.message?.includes('created_by') ||
                error.message?.includes('violates foreign key') ||
                error.message?.includes('violates not-null') ||
                error.code === '23503' || // FK violation
                error.code === '23502'    // not-null violation
            )) {
                logger.warn(`[ProjectService] created_by failed (${error.code}: ${error.message}), retrying without it`, 'PROJECTS');

                const fallbackPayload = {
                    organization_id: organizationId,
                    name: name,
                    description: description,
                    monthly_budget_usd: monthlyBudget
                    // omit created_by
                };

                const fallback = await supabaseAdmin
                    .from('projects')
                    .insert(fallbackPayload)
                    .select()
                    .single();

                data = fallback.data;
                error = fallback.error;
            }

            if (error) {
                logger.error(`[ProjectService] Insert failed: ${error.message} (code=${error.code}) hint=${error.hint} details=${error.details}`, 'PROJECTS');
                throw new Error(`Failed to create project: ${error.message}${error.hint ? ` — ${error.hint}` : ''}`);
            }

            logger.info(`[ProjectService] Project created: id=${data.id}`, 'PROJECTS');

            return {
                success: true,
                project: data
            };

        } catch (error) {
            logger.error(`Create project error: ${error.message}`, 'PROJECTS');
            throw error;
        }
    }

    /**
     * Get all projects for an organization
     * @param {string} organizationId - Organization ID
     * @returns {Object} List of projects
     */
    async getProjects(organizationId) {
        try {
            const { data, error } = await supabaseAdmin
                .from('projects')
                .select(`
          id,
          name,
          description,
          created_at,
          updated_at,
          created_by,
          monthly_budget_usd,
          creator:created_by (
            id,
            email,
            role
          )
        `)
                .eq('organization_id', organizationId)
                .order('created_at', { ascending: false });

            if (error) {
                throw new Error(`Failed to fetch projects: ${error.message}`);
            }

            return {
                success: true,
                projects: data || []
            };

        } catch (error) {
            logger.error(`Get projects error: ${error.message}`, 'PROJECTS');
            throw error;
        }
    }

    /**
     * Get a single project by ID
     * @param {string} projectId - Project ID
     * @param {string} organizationId - Organization ID (for verification)
     * @returns {Object} Project details
     */
    async getProject(projectId, organizationId) {
        try {
            // 1. Get Project Data
            const { data, error } = await supabaseAdmin
                .from('projects')
                .select(`
          id,
          name,
          description,
          created_at,
          updated_at,
          created_by,
          organization_id,
          monthly_budget_usd,
          creator:created_by (
            id,
            email,
            role
          )
        `)
                .eq('id', projectId)
                .eq('organization_id', organizationId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    throw new Error('Project not found');
                }
                throw new Error(`Failed to fetch project: ${error.message}`);
            }

            // 2. Get MTD Spend
            const budgetService = require('./budgetService');
            const mtdSpend = await budgetService.calculateMTDSpend(organizationId, projectId);

            return {
                success: true,
                project: {
                    ...data,
                    mtd_spend: mtdSpend
                }
            };

        } catch (error) {
            logger.error(`Get project error: ${error.message}`, 'PROJECTS');
            throw error;
        }
    }

    /**
     * Update a project
     * @param {string} projectId - Project ID
     * @param {string} organizationId - Organization ID (for verification)
     * @param {Object} updates - Fields to update (name, description)
     * @returns {Object} Updated project
     */
    async updateProject(projectId, organizationId, updates) {
        try {
            const allowedFields = ['name', 'description'];
            const updateData = {};

            // Filter only allowed fields
            for (const field of allowedFields) {
                if (updates[field] !== undefined) {
                    updateData[field] = updates[field];
                }
            }

            const { data, error } = await supabaseAdmin
                .from('projects')
                .update(updateData)
                .eq('id', projectId)
                .eq('organization_id', organizationId)
                .select()
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    throw new Error('Project not found');
                }
                throw new Error(`Failed to update project: ${error.message}`);
            }

            return {
                success: true,
                project: data
            };

        } catch (error) {
            logger.error(`Update project error: ${error.message}`, 'PROJECTS');
            throw error;
        }
    }

    /**
     * Delete a project
     * @param {string} projectId - Project ID
     * @param {string} organizationId - Organization ID (for verification)
     * @returns {Object} Success confirmation
     */
    async deleteProject(projectId, organizationId) {
        try {
            const { error } = await supabaseAdmin
                .from('projects')
                .delete()
                .eq('id', projectId)
                .eq('organization_id', organizationId);

            if (error) {
                throw new Error(`Failed to delete project: ${error.message}`);
            }

            return {
                success: true,
                message: 'Project deleted successfully'
            };

        } catch (error) {
            logger.error(`Delete project error: ${error.message}`, 'PROJECTS');
            throw error;
        }
    }

    /**
     * Get project count for an organization
     * @param {string} organizationId - Organization ID
     * @returns {Object} Count of projects
     */
    async getProjectCount(organizationId) {
        try {
            const { count, error } = await supabaseAdmin
                .from('projects')
                .select('id', { count: 'exact', head: true })
                .eq('organization_id', organizationId);

            if (error) {
                throw new Error(`Failed to count projects: ${error.message}`);
            }

            return {
                success: true,
                count: count || 0
            };

        } catch (error) {
            logger.error(`Get project count error: ${error.message}`, 'PROJECTS');
            throw error;
        }
    }
}

module.exports = new ProjectService();
