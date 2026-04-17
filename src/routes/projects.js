const express = require('express');
const projectService = require('../services/projectService');
const { authenticate, requireAdmin, requireOwner } = require('../middleware/auth');
const { authorizeStatus } = require('../middleware/authorizeStatus');
const { attachSubscriptionInfo, requireActiveSubscription, checkProjectLimit } = require('../middleware/subscription');
const logger = require('../config/logger');

const router = express.Router();

// All routes require authentication and attach subscription info
router.use(authenticate);
router.use(authorizeStatus);
router.use(attachSubscriptionInfo);

/**
 * GET /api/projects
 * Get all projects for the authenticated user's organization
 */
router.get('/', async (req, res) => {
    try {
        // Support both camelCase and snake_case org ID from JWT
        const organizationId = req.user.organizationId || req.user.organization_id;

        const result = await projectService.getProjects(organizationId);

        return res.status(200).json(result);

    } catch (error) {
        logger.error(`Get projects route error: ${error.message}`, 'PROJECTS');
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch projects'
        });
    }
});

/**
 * GET /api/projects/count
 * Get project count for the organization
 */
router.get('/count', async (req, res) => {
    try {
        const organizationId = req.user.organizationId || req.user.organization_id;

        const result = await projectService.getProjectCount(organizationId);

        return res.status(200).json(result);

    } catch (error) {
        logger.error(`Get project count route error: ${error.message}`, 'PROJECTS');
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to get project count'
        });
    }
});

/**
 * GET /api/projects/:id
 * Get a specific project by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = req.user.organizationId || req.user.organization_id;

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid project ID format'
            });
        }

        const result = await projectService.getProject(id, organizationId);

        return res.status(200).json(result);

    } catch (error) {
        logger.error(`Get project route error: ${error.message}`, 'PROJECTS');

        const statusCode = error.message === 'Project not found' ? 404 : 500;

        return res.status(statusCode).json({
            success: false,
            error: error.message || 'Failed to fetch project'
        });
    }
});

/**
 * POST /api/projects
 * Create a new project
 * 
 * Middleware chain:
 *   authenticate → authorizeStatus → attachSubscriptionInfo
 *   → requireAdmin → requireActiveSubscription (beta: passthrough) → checkProjectLimit (beta: passthrough)
 *   → handler
 */
router.post('/', requireAdmin, async (req, res) => {
    try {
        const orgId = req.user.organizationId || req.user.organization_id;
        const role = req.user.role;
        const userId = req.user.id;

        // Log every attempt
        logger.info('Create project attempt', {
            orgId, role,
            body: req.body,
            userId
        });

        // Check org id
        if (!orgId) {
            return res.status(400).json({
                success: false,
                error: 'Organization not found in your session. Please log out and log in again.'
            });
        }

        // Get fields — accept multiple field name formats
        const name = (
            req.body.name || 
            req.body.projectName || 
            ''
        ).trim();

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Project name is required'
            });
        }

        const description = req.body.description || '';
        const budget = parseFloat(
            req.body.monthly_budget_usd || 
            req.body.budget || 
            0
        );

        // Check if org exists and is active (using supabase directly for speed here as requested for "bulletproof")
        const { data: org, error: orgError } = await projectService.supabase
            .from('organizations')
            .select('subscription_status')
            .eq('id', orgId)
            .single();

        if (orgError || !org) {
            logger.error('Organization check failed during project creation', { error: orgError?.message, orgId });
            return res.status(403).json({
                success: false,
                error: 'Your organization account could not be found or is inactive.'
            });
        }

        if (org.subscription_status === 'pending') {
            return res.status(403).json({
                success: false,
                error: 'Your account is pending approval.'
            });
        }

        // Insert project via service
        const result = await projectService.createProject(
            orgId,
            userId,
            name,
            description,
            budget
        );

        logger.info('Project created successfully', {
            projectId: result.project?.id || result.id,
            orgId,
            name
        });

        return res.status(201).json(result);

    } catch (err) {
        logger.error('Create project exception', {
            error: err.message,
            stack: err.stack
        });
        return res.status(500).json({
            success: false,
            error: err.message || 'An unexpected error occurred while creating project'
        });
    }
});

/**
 * PUT /api/projects/:id
 * Update a project (Admin only)
 */
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const organizationId = req.user.organizationId || req.user.organization_id;

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid project ID format'
            });
        }

        // Validation
        if (name !== undefined) {
            if (name.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    error: 'Project name must be at least 2 characters long'
                });
            }
            if (name.length > 255) {
                return res.status(400).json({
                    success: false,
                    error: 'Project name must be less than 255 characters'
                });
            }
        }

        const updates = {};
        if (name !== undefined) updates.name = name.trim();
        if (description !== undefined) updates.description = description.trim();

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No fields to update'
            });
        }

        const result = await projectService.updateProject(id, organizationId, updates);

        return res.status(200).json(result);

    } catch (error) {
        logger.error(`Update project route error: ${error.message}`, 'PROJECTS');

        const statusCode = error.message === 'Project not found' ? 404 : 500;

        return res.status(statusCode).json({
            success: false,
            error: error.message || 'Failed to update project'
        });
    }
});

/**
 * DELETE /api/projects/:id
 * Delete a project (Owner only — irreversible)
 */
router.delete('/:id', requireOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = req.user.organizationId || req.user.organization_id;

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid project ID format'
            });
        }

        const result = await projectService.deleteProject(id, organizationId);

        return res.status(200).json(result);

    } catch (error) {
        logger.error(`Delete project route error: ${error.message}`, 'PROJECTS');
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete project'
        });
    }
});

module.exports = router;
