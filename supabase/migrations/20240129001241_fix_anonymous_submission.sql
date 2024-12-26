-- First clean up overlapping policies
DROP POLICY IF EXISTS "anon_submit_feedback_responses" ON feedback_responses;
DROP POLICY IF EXISTS "anon_view_feedback_responses" ON feedback_responses;
DROP POLICY IF EXISTS "anon_insert_feedback_analyses" ON feedback_analyses;

-- Revoke excessive permissions
REVOKE ALL ON feedback_analyses FROM anon;

-- Create a single policy for anonymous feedback submission
CREATE POLICY "anon_submit_feedback_responses"
ON feedback_responses
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM feedback_requests fr
    WHERE fr.id = feedback_request_id
    AND fr.status = 'pending'
    AND fr.unique_link IS NOT NULL
  )
);

-- Create a policy for anonymous feedback viewing (needed for the form)
CREATE POLICY "anon_view_feedback_responses"
ON feedback_responses
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 
    FROM feedback_requests fr
    WHERE fr.id = feedback_request_id
    AND fr.unique_link IS NOT NULL
  )
);

-- Ensure proper permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT ON feedback_responses TO anon;

-- Add debug logging
DO $$
DECLARE
  v_request_id uuid := '92fbee65-ff81-4d70-8c32-45a0c3ed7218';
BEGIN
  RAISE NOTICE 'Testing permissions for request %', v_request_id;
  
  -- Test if we can insert
  IF EXISTS (
    SELECT 1 
    FROM feedback_requests fr
    WHERE fr.id = v_request_id
    AND fr.status = 'pending'
    AND fr.unique_link IS NOT NULL
  ) THEN
    RAISE NOTICE 'Can submit feedback: YES';
  ELSE
    RAISE NOTICE 'Can submit feedback: NO';
  END IF;
END $$; 