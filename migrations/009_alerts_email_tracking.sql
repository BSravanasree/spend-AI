-- ============================================================
-- Migration 009: Alerts Email Tracking + Cleanup
-- ============================================================
-- Adds email tracking to the canonical `alerts` table.
-- Drops the redundant `budget_alerts` table (created in 008)
-- since the codebase uses `alerts` everywhere.
-- ============================================================

-- 1. Add email tracking columns to the canonical alerts table
ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS email_sent       BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_sent_at    TIMESTAMPTZ DEFAULT NULL;

-- 2. Drop the dead budget_alerts table (never used by code)
DROP TABLE IF EXISTS budget_alerts;

-- 3. Add index for email tracking queries
CREATE INDEX IF NOT EXISTS idx_alerts_email_sent
  ON alerts (organization_id, email_sent, created_at DESC);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'alerts'
  AND column_name IN ('email_sent', 'email_sent_at')
ORDER BY column_name;

SELECT 'Migration 009 complete: email tracking added to alerts, budget_alerts dropped' AS status;
