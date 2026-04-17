-- ============================================================
-- Migration 011: Final Cleanup
-- ============================================================
-- Removes any remaining legacy tables or columns.
-- ============================================================

-- 1. Ensure the redundant budget_alerts table is gone
DROP TABLE IF EXISTS budget_alerts;

SELECT 'Migration 011 complete: redundant tables dropped' AS status;
