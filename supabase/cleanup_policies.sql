-- Final cleanup of duplicate policies
BEGIN;

-- First verify existing policies we want to keep
DO $$
BEGIN
  -- Check if the policies we want to keep exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'employees'
    AND policyname = 'Users can delete their own employees'
  ) THEN
    RAISE EXCEPTION 'Required policy "Users can delete their own employees" does not exist';
  END IF;
END $$;

-- Drop redundant employee policies
DROP POLICY IF EXISTS "Allow authenticated users to delete employees" ON employees;
DROP POLICY IF EXISTS "Users can delete their employees" ON employees;
DROP POLICY IF EXISTS "Allow authenticated users to insert employees" ON employees;
DROP POLICY IF EXISTS "Users can create employees" ON employees;
DROP POLICY IF EXISTS "Users can create their employees" ON employees;
DROP POLICY IF EXISTS "Users can view employees" ON employees;
DROP POLICY IF EXISTS "Users can view their employees" ON employees;
DROP POLICY IF EXISTS "Allow authenticated users to update employees" ON employees;
DROP POLICY IF EXISTS "Users can update their employees" ON employees;
DROP POLICY IF EXISTS "Users can manage employees" ON employees;

-- Clean up duplicate feedback request policies (only within transaction)
DROP POLICY IF EXISTS "Users can delete their own feedback requests" ON feedback_requests;

-- Clean up duplicate feedback response policies (only within transaction)
DROP POLICY IF EXISTS "anon_submit_feedback_responses" ON feedback_responses;

-- Verify final state
SELECT 
    tablename,
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('employees', 'feedback_requests', 'feedback_responses')
ORDER BY tablename, cmd;

COMMIT; 