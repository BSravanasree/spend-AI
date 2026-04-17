-- ============================================
-- MANUAL BILLING SCHEMA FOR SPEND AI
-- Run this migration to add subscription management
-- ============================================

-- Add subscription fields to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(50) DEFAULT 'free' CHECK (plan_tier IN ('free', 'starter', 'pro', 'enterprise'));
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'pending' CHECK (subscription_status IN ('pending', 'trial', 'active', 'expired', 'canceled'));
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_starts_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_projects INTEGER DEFAULT 3;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 5;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_monthly_spend_usd DECIMAL(10,2) DEFAULT 100.00;

-- Add billing contact info
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_contact_name VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_phone VARCHAR(50);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_address TEXT;

-- Add admin notes for manual tracking
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orgs_subscription_status ON organizations(subscription_status);
CREATE INDEX IF NOT EXISTS idx_orgs_plan_tier ON organizations(plan_tier);
CREATE INDEX IF NOT EXISTS idx_orgs_subscription_ends ON organizations(subscription_ends_at);

-- ============================================
-- SUBSCRIPTION HISTORY (Track all changes)
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- What changed
  action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'approved', 'activated', 'renewed', 'upgraded', 'downgraded', 'expired', 'canceled')),
  old_plan_tier VARCHAR(50),
  new_plan_tier VARCHAR(50),
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  
  -- Payment tracking
  amount_paid_usd DECIMAL(10,2),
  payment_method VARCHAR(50), -- 'bank_transfer', 'upi', 'paypal', etc.
  payment_reference VARCHAR(255), -- Transaction ID or reference
  invoice_number VARCHAR(100),
  
  -- Who did it
  changed_by UUID REFERENCES users(id),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_history_org ON subscription_history(organization_id, created_at DESC);

-- ============================================
-- INVOICES (Manual invoice tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  amount_usd DECIMAL(10,2) NOT NULL,
  plan_tier VARCHAR(50) NOT NULL,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'overdue', 'canceled')),
  
  -- Payment details
  paid_at TIMESTAMPTZ,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  
  -- Invoice details
  invoice_url TEXT, -- Link to PDF if you generate one
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

-- ============================================
-- BUDGET_ALERTS (Enhanced with email tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('budget_threshold', 'budget_exceeded', 'trial_ending', 'subscription_expiring')),
  threshold_percent INTEGER,
  current_spend_usd DECIMAL(10,2),
  budget_limit_usd DECIMAL(10,2),
  
  -- Email tracking
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  
  notified_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ
);

CREATE INDEX idx_budget_alerts_org ON budget_alerts(organization_id);
CREATE INDEX idx_budget_alerts_type ON budget_alerts(alert_type);

-- ============================================
-- ADMIN_ACTIONS (Audit log for admin activities)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  
  action_type VARCHAR(100) NOT NULL, -- 'approve_signup', 'activate_subscription', 'mark_invoice_paid', etc.
  entity_type VARCHAR(50), -- 'organization', 'invoice', 'user'
  entity_id UUID,
  
  details JSONB, -- Store any additional data
  ip_address VARCHAR(50),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_user_id, created_at DESC);
CREATE INDEX idx_admin_actions_org ON admin_actions(organization_id);

-- ============================================
-- UPDATE USERS TABLE (Add super admin role)
-- ============================================
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('owner', 'admin', 'member', 'super_admin'));

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to organizations
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON organizations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Apply to invoices
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at 
  BEFORE UPDATE ON invoices 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INITIAL DATA (Plan definitions)
-- ============================================

-- Set trial period for new signups (14 days)
UPDATE organizations 
SET 
  subscription_status = 'trial',
  trial_ends_at = NOW() + INTERVAL '14 days'
WHERE subscription_status = 'pending' AND trial_ends_at IS NULL;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check schema
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'organizations' 
  AND column_name IN ('plan_tier', 'subscription_status', 'max_projects')
ORDER BY ordinal_position;

-- Verify new tables
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('subscription_history', 'invoices', 'budget_alerts', 'admin_actions');

COMMENT ON TABLE subscription_history IS 'Tracks all subscription changes for audit trail';
COMMENT ON TABLE invoices IS 'Manual invoice tracking for billing';
COMMENT ON TABLE budget_alerts IS 'Budget threshold alerts and notifications';
COMMENT ON TABLE admin_actions IS 'Audit log for all admin activities';
