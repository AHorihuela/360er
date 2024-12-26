-- Clean up overlapping policies
DROP POLICY IF EXISTS "anon_view_feedback_request_by_link" ON feedback_requests;
DROP POLICY IF EXISTS "anon_view_feedback_requests" ON feedback_requests;
DROP POLICY IF EXISTS "anon_submit_feedback_responses" ON feedback_responses;
DROP POLICY IF EXISTS "anon_view_feedback_responses" ON feedback_responses;

-- Create single, clear policy for anonymous feedback request access
CREATE POLICY "anon_access_feedback_requests"
ON feedback_requests
FOR SELECT
TO anon
USING (
  unique_link IS NOT NULL
  AND unique_link = current_setting('request.querystring')::json->>'unique_link'
);

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
    AND fr.unique_link = current_setting('request.querystring')::json->>'unique_link'
    AND fr.status = 'pending'
  )
);

-- Create policy for anonymous feedback response viewing
CREATE POLICY "anon_view_feedback_responses"
ON feedback_responses
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 
    FROM feedback_requests fr
    WHERE fr.id = feedback_request_id
    AND fr.unique_link = current_setting('request.querystring')::json->>'unique_link'
  )
);

-- Ensure RLS is enabled
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON feedback_requests TO anon;
GRANT SELECT, INSERT ON feedback_responses TO anon;

-- Add debug logging
DO $$
DECLARE
  v_unique_link text;
  v_request_id uuid;
BEGIN
  -- Get the test values
  v_unique_link := 'jBa26kdzeHqO';
  v_request_id := '92fbee65-ff81-4d70-8c32-45a0c3ed7218';
  
  -- Log the check
  RAISE NOTICE 'Testing policy for link % and request %', v_unique_link, v_request_id;
  
  -- Test feedback request access
  IF EXISTS (
    SELECT 1 
    FROM feedback_requests 
    WHERE unique_link = v_unique_link
  ) THEN
    RAISE NOTICE 'Can access feedback request: YES';
  ELSE
    RAISE NOTICE 'Can access feedback request: NO';
  END IF;
  
  -- Test feedback submission
  IF EXISTS (
    SELECT 1 
    FROM feedback_requests fr
    WHERE fr.id = v_request_id
    AND fr.status = 'pending'
  ) THEN
    RAISE NOTICE 'Can submit feedback: YES';
  ELSE
    RAISE NOTICE 'Can submit feedback: NO';
  END IF;
END $$; 