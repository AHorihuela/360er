-- Migration: Add keep_alive table for Supabase free tier health checks
-- Purpose: Prevents database pause by enabling INSERT/DELETE activity patterns
-- Safety: Isolated table with no foreign keys, service_role access only

-- Create the keep_alive table
CREATE TABLE IF NOT EXISTS keep_alive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS (required for security)
ALTER TABLE keep_alive ENABLE ROW LEVEL SECURITY;

-- Restrictive policy: only service_role can access
-- (service_role bypasses RLS by default, but explicit for clarity)
CREATE POLICY "Service role manages keep_alive"
  ON keep_alive
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Document the table's purpose
COMMENT ON TABLE keep_alive IS 'Automated health check table to prevent Supabase free tier pause. Contains no business data.';
