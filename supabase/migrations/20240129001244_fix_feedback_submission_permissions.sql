-- Drop existing policies
DROP POLICY IF EXISTS "anon_submit_feedback_responses" ON feedback_responses;
DROP POLICY IF EXISTS "anon_view_feedback_responses" ON feedback_responses;

-- Create policy for anonymous feedback submission
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

-- Create policy for anonymous feedback viewing
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

-- Ensure RLS is enabled
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON feedback_requests TO anon;
GRANT SELECT, INSERT ON feedback_responses TO anon;

-- Add debug logging
DO $$
DECLARE
  v_request_id uuid := '92fbee65-ff81-4d70-8c32-45a0c3ed7218';
BEGIN
  -- Log the check
  RAISE NOTICE 'Testing feedback submission for request %', v_request_id;
  
  -- Test if we can insert
  IF EXISTS (
    SELECT 1 
    FROM feedback_requests fr
    WHERE fr.id = v_request_id
    AND fr.status = 'pending'
    AND fr.unique_link IS NOT NULL
  ) THEN
    RAISE NOTICE 'Can submit feedback: YES';
    
    -- Also test if we can view feedback
    IF EXISTS (
      SELECT 1 
      FROM feedback_requests fr
      WHERE fr.id = v_request_id
      AND fr.unique_link IS NOT NULL
    ) THEN
      RAISE NOTICE 'Can view feedback: YES';
    ELSE
      RAISE NOTICE 'Can view feedback: NO';
    END IF;
  ELSE
    RAISE NOTICE 'Can submit feedback: NO';
  END IF;
END $$; 