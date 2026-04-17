const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorizeStatus } = require('../middleware/authorizeStatus');
const analyticsService = require('../services/analyticsService');
const logger = require('../config/logger');

const router = express.Router();

// Apply auth and status check to all routes
router.use(authenticate);
router.use(authorizeStatus);

/**
 * GET /api/analytics/summary
 * Returns spend summary (MTD, 7d, 30d)
 */
router.get('/summary', async (req, res) => {
    try {
        const summary = await analyticsService.getSpendSummary(req.user.organization_id);
        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        logger.error(`Analytics Summary Error: ${error.message}`, 'ANALYTICS');
        res.status(500).json({
            success: false,
            error: 'Failed to fetch spend summary'
        });
    }
});

/**
 * GET /api/analytics/projects?days=30
 * Returns spend breakdown by project (default last 30 days, max 90)
 */
router.get('/projects', async (req, res) => {
    try {
        const days = Math.min(parseInt(req.query.days) || 30, 90);
        const projects = await analyticsService.getSpendByProject(req.user.organization_id, { days });
        res.json({
            success: true,
            data: projects
        });
    } catch (error) {
        logger.error(`Analytics Projects Error: ${error.message}`, 'ANALYTICS');
        res.status(500).json({
            success: false,
            error: 'Failed to fetch project spend breakdown'
        });
    }
});

/**
 * GET /api/analytics/models?days=30
 * Returns spend breakdown by model (default last 30 days, max 90)
 */
router.get('/models', async (req, res) => {
    try {
        const days = Math.min(parseInt(req.query.days) || 30, 90);
        const models = await analyticsService.getSpendByModel(req.user.organization_id, { days });
        res.json({
            success: true,
            data: models
        });
    } catch (error) {
        logger.error(`Analytics Models Error: ${error.message}`, 'ANALYTICS');
        res.status(500).json({
            success: false,
            error: 'Failed to fetch model spend breakdown'
        });
    }
});

/**
 * GET /api/analytics/daily?days=30
 * Returns daily spend over time (default 30 days, max 90)
 * Accepts ?days=7|30|90 — used by the Dashboard range selector
 */
router.get('/daily', async (req, res) => {
    try {
        const days = Math.min(parseInt(req.query.days) || 30, 90);
        const daily = await analyticsService.getDailySpend(req.user.organization_id, days);
        res.json({
            success: true,
            data: daily
        });
    } catch (error) {
        logger.error(`Analytics Daily Error: ${error.message}`, 'ANALYTICS');
        res.status(500).json({
            success: false,
            error: 'Failed to fetch daily spend data'
        });
    }
});

module.exports = router;
