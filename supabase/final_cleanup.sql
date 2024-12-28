-- Final cleanup to consolidate duplicate anonymous SELECT policies
BEGIN;

-- First verify the policy we want to keep exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'employees'
    AND policyname = 'anon_view_employees'
  ) THEN
    RAISE EXCEPTION 'Required policy "anon_view_employees" does not exist';
  END IF;
END $$;

-- Drop the redundant EXISTS-based policy
DROP POLICY IF EXISTS "Anyone can view associated employees" ON employees;

-- Verify final state
SELECT 
    tablename,
    policyname,
    cmd,
    roles,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename = 'employees'
    AND roles = '{anon}'
ORDER BY cmd;

COMMIT; 