const express = require('express');
const authService = require('../services/authService');
const { authenticate } = require('../middleware/auth');
const { sendNewOrganizationAlert, sendWelcomeEmail } = require('../services/emailService');
const logger = require('../config/logger');

const router = express.Router();

/**
 * POST /api/auth/signup
 * Create a new user and organization
 */
router.post('/signup', async (req, res) => {
    try {
        const { email, password, organizationName } = req.body;

        // Validation
        if (!email || !password || !organizationName) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, and organization name are required'
            });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Password validation (minimum 8 characters)
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters long'
            });
        }

        // Organization name validation
        if (organizationName.trim().length < 2 || organizationName.trim().length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Organization name must be between 2 and 100 characters'
            });
        }

        // Call signup service
        const result = await authService.signup(email, password, organizationName);

        // Fire-and-forget: alerts (must not block or throw)
        sendWelcomeEmail(email, organizationName).catch(e => logger.error(`Welcome email failed: ${e.message}`));
        sendNewOrganizationAlert(organizationName, email).catch((err) => {
            logger.error(`Signup: sendNewOrganizationAlert failed: ${err.message}`, 'AUTH');
        });

        return res.status(201).json(result);

    } catch (error) {
        logger.error(`Signup route error: ${error.message}`, 'AUTH');
        const message = error.message || 'Signup failed';
        return res.status(500).json({
            success: false,
            error: message
        });
    }
});

/**
 * POST /api/auth/login
 * Log in an existing user
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Call login service
        const result = await authService.login(email, password);

        return res.status(200).json(result);

    } catch (error) {
        logger.error(`Login route error: ${error.message}`, 'AUTH');

        // Return appropriate error status
        const statusCode = error.message.includes('Invalid login credentials') ? 401 : 500;

        return res.status(statusCode).json({
            success: false,
            error: error.message || 'Login failed'
        });
    }
});

/**
 * GET /api/auth/me
 * Get current user profile (requires authentication)
 */
router.get('/me', authenticate, async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            user: req.user
        });
    } catch (error) {
        logger.error(`Get user route error: ${error.message}`, 'AUTH');
        return res.status(500).json({
            success: false,
            error: 'Failed to get user profile'
        });
    }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', authenticate, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : null;

        if (token) {
            const { error } = await require('../config/supabase').supabaseAdmin.auth.admin.signOut(
                req.user.id
            );

            if (error) {
                logger.warn(`Supabase signOut warning: ${error.message}`, 'AUTH');
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        logger.error(`Logout route error: ${error.message}`, 'AUTH');
        return res.status(200).json({
            success: true,
            message: 'Logged out (client should clear local storage)'
        });
    }
});

module.exports = router;
