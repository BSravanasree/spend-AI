const { Queue, Worker } = require('bullmq');
const { supabaseAdmin } = require('../config/supabase');
const budgetService = require('../services/budgetService');
const logger = require('../config/logger');

// Parse REDIS_URL into a BullMQ-compatible connection object.
// Supports redis:// (plain) and rediss:// (TLS — required for Render Redis).
const connection = process.env.REDIS_URL
    ? (() => {
        const url = new URL(process.env.REDIS_URL);
        return {
            host: url.hostname,
            port: Number(url.port) || 6379,
            password: url.password || undefined,
            tls: process.env.REDIS_URL.startsWith('rediss') ? {} : undefined
        };
    })()
    : { host: '127.0.0.1', port: 6379 };

const queueName = 'budget-checks';
let budgetQueue = null;
let worker = null;

// Wrap in a try-block to avoid crashing if Redis is not reachable on startup
try {
    budgetQueue = new Queue(queueName, {
        connection,
        defaultJobOptions: {
            attempts: 1,
            backoff: { type: 'exponential', delay: 5000 }
        }
    });

    // Suppress repeated connection error spam in development console
    budgetQueue.on('error', (err) => {
        if (process.env.NODE_ENV === 'development' && err.code === 'ECONNREFUSED') {
            // Log only once per minute to avoid spamming
            if (!global.lastRedisErrLog || Date.now() - global.lastRedisErrLog > 60000) {
                logger.warn(`[Job] Redis unavailable at ${connection.host}:${connection.port}. Background jobs disabled.`, 'REDIS');
                global.lastRedisErrLog = Date.now();
            }
        } else {
            logger.error(`[Queue Error] ${err.message}`);
        }
    });

    // 1. Worker definition
    worker = new Worker(
        queueName,
        async (job) => {
            logger.info(`[Job] Starting budget check for all organizations...`, 'JOB');

            try {
                const { data: orgs, error } = await supabaseAdmin
                    .from('organizations')
                    .select('id, name')
                    .eq('subscription_status', 'active');

                if (error) throw error;

                for (const org of orgs) {
                    const orgData = await budgetService.getOrgBudget(org.id);
                    if (orgData.budget > 0) {
                        await budgetService.evaluateThresholds({
                            organization_id: org.id,
                            project_id: null,
                            alert_level: 'organization',
                            budget: orgData.budget,
                            actual: orgData.actual_spend
                        });
                    }

                    const { data: projects } = await supabaseAdmin
                        .from('projects')
                        .select('id')
                        .eq('organization_id', org.id);

                    if (projects) {
                        for (const proj of projects) {
                            const projectData = await budgetService.getProjectBudget(proj.id);
                            if (projectData.budget > 0) {
                                await budgetService.evaluateThresholds({
                                    organization_id: org.id,
                                    project_id: proj.id,
                                    alert_level: 'project',
                                    budget: projectData.budget,
                                    actual: projectData.actual_spend
                                });
                            }
                        }
                    }
                }

                logger.info(`[Job] Budget check completed successfully`, 'JOB');
                return { processed: orgs.length };
            } catch (err) {
                logger.error(`[Job] Budget check failed: ${err.message}`, 'JOB');
                throw err;
            }
        },
        { connection }
    );

    worker.on('error', (err) => {
        // Suppress worker connection errors too
    });

} catch (initErr) {
    logger.error(`[Job] Could not initialize BullMQ: ${initErr.message}`, 'STARTUP');
}

// 2. Scheduler setup for repeatable jobs
async function setupBudgetJob() {
    if (!budgetQueue) {
        logger.warn('[Job] Skipping job scheduling - Redis not initialized', 'JOB');
        return;
    }

    try {
        // Clean up previous repeatable jobs
        const repeatableJobs = await budgetQueue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            await budgetQueue.removeRepeatableByKey(job.key);
        }

        // Add repeatable job: every 60 minutes
        await budgetQueue.add(
            'hourly-budget-check',
            {},
            {
                repeat: {
                    cron: '0 * * * *',
                },
                removeOnComplete: true,
                removeOnFail: 1000
            }
        );

        logger.info(`[Job] Hourly budget check job scheduled`, 'JOB');
    } catch (err) {
        if (err.code === 'ECONNREFUSED') {
            logger.warn('[Job] Redis connection refused. Scheduling skipped.', 'JOB');
        } else {
            logger.error(`[Job] Scheduling failed: ${err.message}`, 'JOB');
        }
    }
}

module.exports = {
    setupBudgetJob,
    budgetQueue
};
