const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { authorizeStatus } = require('../middleware/authorizeStatus');
const budgetService = require('../services/budgetService');
const alertService = require('../services/alertService');
const logger = require('../config/logger');

const router = express.Router();

// Apply auth and status check to all routes
router.use(authenticate);
router.use(authorizeStatus);

/**
 * GET /api/budgets/summary
 * Returns current org budget and project budgets with spend
 */
router.get('/summary', async (req, res) => {
    try {
        const orgData = await budgetService.getOrgBudget(req.user.organization_id);

        // For project budgets, we would ideally fetch projects and their budgets
        // For MVP, we'll return the org one first
        res.json({
            success: true,
            data: {
                organization: orgData
            }
        });
    } catch (error) {
        logger.error(`Failed to fetch budget summary: ${error.message}`, 'BUDGET');
        res.status(500).json({ success: false, error: 'Failed to fetch budget summary' });
    }
});

/**
 * PUT /api/budgets/org
 * Update organization budget (Admin only)
 */
router.put('/org', requireAdmin, async (req, res) => {
    try {
        const { budget } = req.body;
        if (budget === undefined || budget < 0) {
            return res.status(400).json({ success: false, error: 'Invalid budget amount' });
        }

        const data = await budgetService.updateOrgBudget(req.user.organization_id, budget);
        res.json({ success: true, data });
    } catch (error) {
        logger.error(`Failed to update organization budget: ${error.message}`, 'BUDGET');
        res.status(500).json({ success: false, error: 'Failed to update organization budget' });
    }
});

/**
 * PUT /api/budgets/projects/:projectId
 * Update project budget (Admin only)
 */
router.put('/projects/:projectId', requireAdmin, async (req, res) => {
    try {
        const { budget } = req.body;
        const { projectId } = req.params;

        if (budget === undefined || budget < 0) {
            return res.status(400).json({ success: false, error: 'Invalid budget amount' });
        }

        const data = await budgetService.updateProjectBudget(projectId, budget);
        res.json({ success: true, data });
    } catch (error) {
        logger.error(`Failed to update project budget: ${error.message}`, 'BUDGET');
        res.status(500).json({ success: false, error: 'Failed to update project budget' });
    }
});

/**
 * GET /api/budgets/alerts
 * Get triggered alerts for organization
 */
router.get('/alerts', async (req, res) => {
    try {
        const alerts = await alertService.getAlerts(req.user.organization_id);
        res.json({ success: true, data: alerts });
    } catch (error) {
        logger.error(`Failed to fetch alerts: ${error.message}`, 'BUDGET');
        res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
    }
});

module.exports = router;

