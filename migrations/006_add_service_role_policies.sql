-- Phase 9 Migration: Fix Service Role Permissions
-- Run this in Supabase SQL Editor to allow backend to insert data
-- This is required because in some Supabase configurations, service_role key does not automatically bypass RLS
-- or explicitly enabled RLS requires explicit policies.

-- 1. Organizations Policies
DROP POLICY IF EXISTS "Service role can all organizations" ON organizations;
CREATE POLICY "Service role can all organizations"
  ON organizations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Users Policies
DROP POLICY IF EXISTS "Service role can all users" ON users;
CREATE POLICY "Service role can all users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Projects Policies
DROP POLICY IF EXISTS "Service role can all projects" ON projects;
CREATE POLICY "Service role can all projects"
  ON projects
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Proxy Keys Policies
DROP POLICY IF EXISTS "Service role can all proxy_keys" ON proxy_keys;
CREATE POLICY "Service role can all proxy_keys"
  ON proxy_keys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Usage Logs Policies
-- (Dropping specific INSERT policy from 001 if it conflicts, or just adding a broad one)
DROP POLICY IF EXISTS "Service role can insert usage logs" ON usage_logs;
DROP POLICY IF EXISTS "Service role can all usage_logs" ON usage_logs;

CREATE POLICY "Service role can all usage_logs"
  ON usage_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verification
SELECT 'Phase 9 migration complete: Service role policies added' as status;
