require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { v4: uuidv4 } = require('uuid');
const env = require('./config/env');
const logger = require('./config/logger');

// 1. Environment Validation
env.validate();

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// Enable trust proxy for Render/Vercel (required for rate limiting)
if (isProd) {
    app.set('trust proxy', 1);
}

// ── Rate Limiters ─────────────────────────────────────────────────────────

// Standard API limit: 100 requests per 15 mins
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Auth limit: 10 requests per 15 mins
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, error: 'Too many auth attempts. Please wait 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Proxy limit: 1000 requests per minute (Org-based tracking is handled in middleware, this is IP safety)
const proxyLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 1000,
    message: { success: false, error: 'Proxy rate limit exceeded.' },
    standardHeaders: true,
    legacyHeaders: false
});

// ── Security & Middleware ─────────────────────────────────────────────────

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// Request ID Tracking
app.use((req, res, next) => {
    req.requestId = uuidv4();
    res.setHeader('X-Request-ID', req.requestId);
    next();
});

// CORS Config
const allowedOrigins = [
    'https://spendai-2-0.vercel.app',           // Production frontend (hardcoded fallback)
    'https://www.spendai-2-0.vercel.app',
    process.env.FRONTEND_URL,                    // Override via env var if needed
    'http://localhost:5173',                     // Local dev
    'http://localhost:3000'
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || !isProd) {
            callback(null, true);
        } else {
            logger.warn(`CORS Rejected: ${origin}`, 'CORS');
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────

// Import routes
const authRoutes = require('./routes/auth');
const googleAuthRoutes = require('./routes/googleAuth');
const projectRoutes = require('./routes/projects');
const proxyKeyRoutes = require('./routes/proxyKeys');
const openaiProxyRoutes = require('./routes/openaiProxy');
const analyticsRoutes = require('./routes/analytics');
const budgetRoutes = require('./routes/budgets');
const diagnosticRoutes = require('./routes/diagnostics');
const adminRoutes = require('./routes/admin');
const billingRoutes = require('./routes/billing');
const settingsRoutes = require('./routes/settings');

// Apply limiters
app.use('/api/auth', authLimiter);

// API Logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, { requestId: req.requestId });
    next();
});

// Resources
app.get('/', (req, res) => {
    res.json({ message: 'SpendAI Backend API is live', requestId: req.requestId });
});

app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/projects', globalLimiter, projectRoutes);
app.use('/api/proxy-keys', globalLimiter, proxyKeyRoutes);
app.use('/api/analytics', globalLimiter, analyticsRoutes);
app.use('/api/budgets', globalLimiter, budgetRoutes);
app.use('/api/diagnostics', diagnosticRoutes); // Diagnostics have their own internal checks
app.use('/api/admin', globalLimiter, adminRoutes);
app.use('/api/billing', globalLimiter, billingRoutes);
app.use('/api/settings', globalLimiter, settingsRoutes);

// OpenAI Proxy Routes (The high-performance path)
app.use('/v1', proxyLimiter, openaiProxyRoutes);

// ── Error Handling ────────────────────────────────────────────────────────

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        requestId: req.requestId
    });
});

app.use((err, req, res, next) => {
    logger.error(`${err.message} - ${req.requestId}`, 'UNCAUGHT_ERR');

    const statusCode = err.status || 500;
    const response = {
        success: false,
        error: isProd ? 'Internal server error' : err.message,
        requestId: req.requestId
    };

    if (!isProd && err.stack) {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
});

// Start Server
const { setupBudgetJob } = require('./jobs/budgetCheckJob');
const server = app.listen(PORT, '0.0.0.0', async () => {
    logger.info(`SpendAI Server started on port ${PORT}`, 'STARTUP');
    try {
        await setupBudgetJob();
        logger.info('Background jobs initialized', 'STARTUP');
    } catch (err) {
        logger.error(`Jobs failed: ${err.message}`, 'STARTUP');
    }
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'LIFECYCLE');
});

module.exports = app;
