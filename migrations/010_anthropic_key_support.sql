-- ============================================================
-- Migration 010: Anthropic API Key Support
-- ============================================================
-- Adds anthropic_api_key column to organizations table.
-- Column is stored encrypted (same as openai_api_key via AES-256-GCM).
-- ============================================================

-- 1. Add encrypted Anthropic key column
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS anthropic_api_key TEXT DEFAULT NULL;

-- 2. Add comment for documentation
COMMENT ON COLUMN organizations.anthropic_api_key IS
  'AES-256-GCM encrypted Anthropic API key. Format: iv:authTag:ciphertext';

SELECT 'Migration 010 complete: anthropic_api_key column added to organizations' AS status;
