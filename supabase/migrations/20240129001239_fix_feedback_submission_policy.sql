-- Drop existing policies
DROP POLICY IF EXISTS "anon_submit_feedback_responses" ON feedback_responses;

-- Create policy for anonymous feedback submission
CREATE POLICY "anon_submit_feedback_responses"
ON feedback_responses
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM feedback_requests fr
    JOIN review_cycles rc ON rc.id = fr.review_cycle_id
    WHERE fr.id = feedback_request_id
    AND fr.status = 'pending'
    AND rc.review_by_date > CURRENT_DATE
  )
);

-- Ensure RLS is enabled
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT ON feedback_responses TO anon;

-- Verify the policy works for our test case
DO $$
BEGIN
  -- Log the check for our specific feedback request
  RAISE NOTICE 'Checking feedback request %', '92fbee65-ff81-4d70-8c32-45a0c3ed7218';
  
  -- Verify the policy would allow insertion
  IF EXISTS (
    SELECT 1 
    FROM feedback_requests fr
    JOIN review_cycles rc ON rc.id = fr.review_cycle_id
    WHERE fr.id = '92fbee65-ff81-4d70-8c32-45a0c3ed7218'
    AND fr.status = 'pending'
    AND rc.review_by_date > CURRENT_DATE
  ) THEN
    RAISE NOTICE 'Policy check passed - insertion would be allowed';
  ELSE
    RAISE NOTICE 'Policy check failed - insertion would be denied';
  END IF;
END $$; 