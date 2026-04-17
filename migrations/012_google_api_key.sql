-- Migration 012: Add Google API key support
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS google_api_key TEXT;

COMMENT ON COLUMN organizations.google_api_key IS 
'AES-256-GCM encrypted Google AI Studio API key';
