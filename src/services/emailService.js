/**
 * Email Service using Resend
 * Handles all transactional emails for SpendAI
 */
const { Resend } = require('resend');
const logger = require('../config/logger');

const resend = new Resend(process.env.RESEND_API_KEY);

// Platform admin email — receives new org alerts
const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL || 'teja41627@gmail.com';
// From address — must be onboarding@resend.dev unless domain is verified
const FROM_EMAIL = 'SpendAI <onboarding@resend.dev>';

/**
 * Base professional HTML template
 */
const getHtmlWrapper = (content) => `
<!DOCTYPE html>
<html>
<body style="background:#080809;color:#f0f0ee;font-family:system-ui,sans-serif;padding:40px;">
  <div style="max-width:560px;margin:0 auto;background:#111;border:1px solid #222;border-radius:12px;padding:32px;">
    <h2 style="color:#5b6af7;margin-bottom:8px;display:flex;align-items:center;">
       SpendAI
    </h2>
    <hr style="border:none;border-top:1px solid #222;margin:20px 0;">
    ${content}
    <hr style="border:none;border-top:1px solid #222;margin:20px 0;">
    <p style="color:#555;font-size:12px;">
      SpendAI · AI API Cost Control<br>
      Questions? Reply to this email.
    </p>
  </div>
</body>
</html>
`;

/**
 * Send welcome email to new user (Pending Approval)
 */
async function sendWelcomeEmail(toEmail, orgName) {
    if (!process.env.RESEND_API_KEY) return;
    try {
        const content = `
            <h3 style="color:#fff;">Welcome to SpendAI!</h3>
            <p style="color:#ccc;line-height:1.6;">
                Thanks for signing up for SpendAI. Your organization <strong>${orgName}</strong> is currently pending approval.
            </p>
            <p style="color:#ccc;line-height:1.6;">
                We typically review and approve accounts within 24 hours. You'll receive another email as soon as your account is ready to use.
            </p>
            <div style="background:#1a1a1a;padding:16px;border-radius:8px;margin-top:24px;">
                <p style="color:#888;margin:0;font-size:14px;"><strong>What's next?</strong></p>
                <ul style="color:#ccc;font-size:14px;padding-left:20px;margin-top:8px;">
                    <li>Wait for the approval email</li>
                    <li>Connect your AI provider keys (OpenAI, Anthropic, or Gemini)</li>
                    <li>Create your first project</li>
                </ul>
            </div>
            <p style="color:#ccc;margin-top:24px;">
                If you have any questions, feel free to reply to this email.
            </p>
        `;

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: toEmail,
            subject: 'Welcome to SpendAI — your account is pending approval',
            html: getHtmlWrapper(content)
        });

        if (error) {
            logger.error('Email failed (Welcome)', { error: error.message, to: toEmail });
        } else {
            logger.info('Email sent (Welcome)', { id: data.id, to: toEmail });
        }
    } catch (error) {
        logger.error('Email exception (Welcome)', { error: error.message, to: toEmail });
    }
}

/**
 * Send alert to platform admin when a new org signs up
 */
async function sendNewOrganizationAlert(orgName, userEmail) {
    if (!process.env.RESEND_API_KEY) return;
    try {
        const content = `
            <h3 style="color:#fff;">New Signup Alert</h3>
            <p style="color:#ccc;line-height:1.6;">
                A new organization has just signed up and is waiting for approval.
            </p>
            <div style="background:#1a1a1a;padding:16px;border-radius:8px;margin:24px 0;">
                <p style="color:#fff;margin:0 0 8px 0;"><strong>${orgName}</strong></p>
                <p style="color:#888;margin:0;font-size:14px;">User: ${userEmail}</p>
                <p style="color:#888;margin:0;font-size:14px;">Time: ${new Date().toUTCString()}</p>
            </div>
            <a href="https://spendai-2-0.vercel.app/admin" style="display:inline-block;background:#5b6af7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Go to Admin Panel</a>
        `;

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: ADMIN_EMAIL,
            subject: `New SpendAI signup — ${orgName}`,
            html: getHtmlWrapper(content)
        });

        if (error) {
            logger.error('Email failed (Admin Alert)', { error: error.message, to: ADMIN_EMAIL });
        } else {
            logger.info('Email sent (Admin Alert)', { id: data.id, to: ADMIN_EMAIL });
        }
    } catch (error) {
        logger.error('Email exception (Admin Alert)', { error: error.message, to: ADMIN_EMAIL });
    }
}

/**
 * Send approval confirmation to the organization owner
 */
async function sendApprovalEmail(orgName, userEmail) {
    if (!process.env.RESEND_API_KEY) return;
    try {
        const content = `
            <h3 style="color:#fff;">Congratulations! Your account is approved.</h3>
            <p style="color:#ccc;line-height:1.6;">
                Your organization <strong>${orgName}</strong> has been approved for SpendAI. You can now log in and take control of your AI spending.
            </p>
            <div style="margin:32px 0;">
                <a href="https://spendai-2-0.vercel.app/login" style="display:inline-block;background:#5b6af7;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;">Login to SpendAI</a>
            </div>
            <div style="background:#1a1a1a;padding:20px;border-radius:12px;border:1px solid #333;">
                <h4 style="color:#fff;margin-top:0;">Quick Start Guide:</h4>
                <ol style="color:#ccc;padding-left:20px;font-size:14px;margin-bottom:0;">
                    <li>Add your AI provider API key in <strong>Settings</strong></li>
                    <li>Create your first <strong>Project</strong></li>
                    <li>Generate a <strong>Proxy Key</strong></li>
                    <li>Swap your base URL to our proxy endpoint</li>
                </ol>
            </div>
        `;

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: userEmail,
            subject: 'Your SpendAI account is approved!',
            html: getHtmlWrapper(content)
        });

        if (error) {
            logger.error('Email failed (Approval)', { error: error.message, to: userEmail });
        } else {
            logger.info('Email sent (Approval)', { id: data.id, to: userEmail });
        }
    } catch (error) {
        logger.error('Email exception (Approval)', { error: error.message, to: userEmail });
    }
}

/**
 * Send budget threshold alert to org admin(s)
 */
async function sendBudgetAlertEmail(params) {
    if (!process.env.RESEND_API_KEY) return;
    const { orgName, recipientEmail, projectName, thresholdPercent, currentSpend, budgetLimit } = params;
    const isCritical = thresholdPercent >= 100;

    try {
        const subject = isCritical
            ? `🚨 Budget exceeded — ${projectName || orgName} blocked`
            : `⚠️ Budget warning — ${projectName || orgName} at ${thresholdPercent}%`;

        const content = `
            <div style="display:inline-block;background:${isCritical ? '#421' : '#431'};border:1px solid ${isCritical ? '#f44' : '#f90'};color:${isCritical ? '#f44' : '#f90'};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold;text-transform:uppercase;margin-bottom:16px;">
                ${isCritical ? 'Critical' : 'Warning'}
            </div>
            <h3 style="color:#fff;">${subject}</h3>
            <p style="color:#ccc;line-height:1.6;">
                The budget for <strong>${projectName || orgName}</strong> has reached the ${thresholdPercent}% threshold.
            </p>
            <div style="background:#1a1a1a;padding:16px;border-radius:8px;margin:24px 0;display:flex;justify-content:space-between;border:1px solid #333;">
                <div style="text-align:center;flex:1;">
                    <p style="color:#888;margin:0;font-size:11px;text-transform:uppercase;">Current Spend</p>
                    <p style="color:#fff;margin:4px 0 0 0;font-size:20px;font-weight:bold;">$${Number(currentSpend).toFixed(2)}</p>
                </div>
                <div style="text-align:center;flex:1;border-left:1px solid #333;">
                    <p style="color:#888;margin:0;font-size:11px;text-transform:uppercase;">Limit</p>
                    <p style="color:#fff;margin:4px 0 0 0;font-size:20px;font-weight:bold;">$${Number(budgetLimit).toFixed(2)}</p>
                </div>
            </div>
            ${isCritical
                ? '<p style="color:#f44;font-weight:600;">All new requests for this resource are currently being blocked.</p>'
                : '<p style="color:#ccc;">Consider increasing your budget or optimizing usage before service disruption.</p>'}
            <a href="https://spendai-2-0.vercel.app/dashboard" style="display:inline-block;background:#5b6af7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Go to Dashboard</a>
        `;

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: recipientEmail,
            subject: subject,
            html: getHtmlWrapper(content)
        });

        if (error) {
            logger.error('Email failed (Budget Alert)', { error: error.message, to: recipientEmail, type: isCritical ? 'critical' : 'warning' });
        } else {
            logger.info('Email sent (Budget Alert)', { id: data.id, to: recipientEmail, type: isCritical ? 'critical' : 'warning' });
        }
    } catch (error) {
        logger.error('Email exception (Budget Alert)', { error: error.message, to: recipientEmail });
    }
}

module.exports = {
    sendNewOrganizationAlert,
    sendApprovalEmail,
    sendBudgetAlertEmail,
    sendWelcomeEmail
};
