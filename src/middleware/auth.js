const authService = require('../services/authService');

/**
 * Middleware to verify JWT token and attach user to request
 */
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Missing or invalid authorization header'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        const result = await authService.verifyToken(token);
        req.user = result.user;

        // Ensure both versions of org ID are available
        if (req.user) {
            const orgId = req.user.organizationId || req.user.organization_id;
            if (orgId) {
                req.user.organizationId = orgId;
                req.user.organization_id = orgId;
            }
        }

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token',
            details: error.message
        });
    }
}

/**
 * requireOwner — only org owner or super_admin may proceed.
 * Use for destructive / irreversible operations (delete project, revoke key).
 */
function requireOwner(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const allowed = ['owner', 'super_admin'];
    if (!allowed.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            error: 'Owner access required',
            requiredRole: 'owner'
        });
    }
    next();
}

/**
 * requireAdmin — owner, admin, or super_admin may proceed.
 * Use for write operations that an admin should control
 * (create project, create proxy key, update budgets, etc.).
 */
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const allowed = ['owner', 'admin', 'super_admin'];
    if (!allowed.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            error: 'Admin access required',
            requiredRole: 'admin'
        });
    }
    next();
}

/**
 * requireMember — any authenticated org member may proceed.
 * This is the baseline guard for read-only routes
 * (analytics, billing overview, project listing, etc.).
 */
function requireMember(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const allowed = ['owner', 'admin', 'member', 'super_admin'];
    if (!allowed.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            error: 'Organization membership required',
            requiredRole: 'member'
        });
    }
    next();
}

module.exports = {
    authenticate,
    requireOwner,
    requireAdmin,
    requireMember
};
