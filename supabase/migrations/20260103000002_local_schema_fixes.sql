-- Migration: Sync local schema with production
-- Purpose: Add missing columns and tables required for local development

-- Add overall_rating column to feedback_responses (used by analytics)
ALTER TABLE feedback_responses ADD COLUMN IF NOT EXISTS overall_rating INTEGER;

-- Create user_roles table (for master account feature - queries this table)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Only create policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Users can view their own role'
  ) THEN
    CREATE POLICY "Users can view their own role" ON user_roles
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Fix RLS policies that cause infinite recursion
-- These policies had {public} role which applies to both anon AND authenticated
-- Changing them to only apply to anon role prevents recursion

-- Fix review_cycles_anon_select
DROP POLICY IF EXISTS review_cycles_anon_select ON review_cycles;
CREATE POLICY review_cycles_anon_select ON review_cycles
  FOR SELECT TO anon
  USING (id IN (
    SELECT DISTINCT review_cycle_id
    FROM feedback_requests
    WHERE unique_link IS NOT NULL
  ));

-- Fix feedback_requests_anon_select
DROP POLICY IF EXISTS feedback_requests_anon_select ON feedback_requests;
CREATE POLICY feedback_requests_anon_select ON feedback_requests
  FOR SELECT TO anon
  USING (unique_link IS NOT NULL);

-- Fix employees_anon_select
DROP POLICY IF EXISTS employees_anon_select ON employees;
CREATE POLICY employees_anon_select ON employees
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM feedback_requests fr
    WHERE fr.employee_id = employees.id AND fr.unique_link IS NOT NULL
  ));

-- Fix feedback_responses_anon_access
DROP POLICY IF EXISTS feedback_responses_anon_access ON feedback_responses;
CREATE POLICY feedback_responses_anon_access ON feedback_responses
  FOR ALL TO anon
  USING (feedback_request_id IN (
    SELECT id FROM feedback_requests WHERE unique_link IS NOT NULL
  ));

-- Fix feedback_responses_anon_select
DROP POLICY IF EXISTS feedback_responses_anon_select ON feedback_responses;
CREATE POLICY feedback_responses_anon_select ON feedback_responses
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM feedback_requests fr
    WHERE fr.id = feedback_responses.feedback_request_id AND fr.unique_link IS NOT NULL
  ));

-- Fix Anonymous users can view their own responses
DROP POLICY IF EXISTS "Anonymous users can view their own responses" ON feedback_responses;
CREATE POLICY "Anonymous users can view their own responses" ON feedback_responses
  FOR SELECT TO anon
  USING (session_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM feedback_requests fr
    WHERE fr.id = feedback_responses.feedback_request_id AND fr.unique_link IS NOT NULL
  ));

-- Fix ai_reports anon policy
DROP POLICY IF EXISTS "Anyone can view AI reports through unique link" ON ai_reports;
CREATE POLICY "Anyone can view AI reports through unique link" ON ai_reports
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM feedback_requests fr
    WHERE fr.id = ai_reports.feedback_request_id AND fr.unique_link IS NOT NULL
  ));

-- Local schema synchronization complete
