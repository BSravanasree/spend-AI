/**
 * Environment Validation
 *
 * Ensures all required secrets and configuration keys are present
 * before the server starts. In production, missing vars cause an
 * immediate crash so Render surfaces the error clearly.
 */

// Always required — app cannot function without these
const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
    'OPENAI_KEY_ENCRYPTION_SECRET',
    'PROXY_KEY_SECRET',
];

// Required only in production
const requiredInProd = [
    'NODE_ENV',
    // Note: FRONTEND_URL defaults to spendai-2-0.vercel.app if not set
];

function validate() {
    const isProd = process.env.NODE_ENV === 'production';
    const missing = [];

    // Check always-required vars
    for (const v of requiredVars) {
        if (!process.env[v] || process.env[v].trim() === '') {
            missing.push(v);
        }
    }

    // Check production-only vars
    if (isProd) {
        for (const v of requiredInProd) {
            if (!process.env[v] || process.env[v].trim() === '') {
                missing.push(v);
            }
        }
    }

    if (missing.length > 0) {
        console.error('\x1b[31m[FATAL] Missing required environment variables:\x1b[0m');
        missing.forEach(v => console.error(`  \x1b[31m✗ ${v}\x1b[0m`));
        console.error('\x1b[31m[FATAL] SpendAI cannot start. Set these vars in Render → Environment.\x1b[0m');
        process.exit(1);
    }

    // Set default NODE_ENV
    if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = 'development';
    }

    // Warn about optional-but-recommended vars
    const recommended = ['RESEND_API_KEY', 'ADMIN_ALERT_EMAIL', 'APP_URL'];
    const missingRec = recommended.filter(v => !process.env[v]);
    if (missingRec.length > 0) {
        console.warn(`\x1b[33m[WARN] Optional vars not set: ${missingRec.join(', ')}\x1b[0m`);
    }

    console.log(`\x1b[32m[INFO] Environment validation passed. Context: ${process.env.NODE_ENV}\x1b[0m`);
}

module.exports = { validate };
