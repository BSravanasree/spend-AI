/**
 * Middleware to enforce organization approval status
 * Blocks access to API routes if the organization is pending or suspended
 */
const authorizeStatus = (req, res, next) => {
    // 1. If not authenticated, let auth middleware handle it (or pass through public routes)
    if (!req.user) {
        return next();
    }

    // 2. Super admins are exempt from status checks (they need to approve others!)
    if (req.user.role === 'super_admin') {
        return next();
    }

    const status = req.user.organization?.subscription_status;

    // 3. Check for pending status
    if (status === 'pending') {
        return res.status(403).json({
            error: 'Organization awaiting approval',
            code: 'ORG_PENDING'
        });
    }

    // 4. Check for suspended/banned status (optional future-proofing)
    if (status === 'suspended' || status === 'banned') {
        return res.status(403).json({
            error: 'Organization access suspended',
            code: 'ORG_SUSPENDED'
        });
    }

    // 5. Allow active, trial, canceled, expired (expired might have limited access, handled elsewhere)
    next();
};

module.exports = { authorizeStatus };
