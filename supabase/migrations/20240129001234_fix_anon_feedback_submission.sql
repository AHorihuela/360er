-- Drop existing policies
DROP POLICY IF EXISTS "anon_submit_feedback_responses" ON feedback_responses;
DROP POLICY IF EXISTS "anon_view_feedback_responses" ON feedback_responses;

-- Enable RLS
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to anon role
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT ON feedback_responses TO anon;

-- Create policy for anonymous feedback submission
CREATE POLICY "anon_submit_feedback_responses"
ON feedback_responses
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM feedback_requests fr
    WHERE fr.id = feedback_request_id
    AND fr.status = 'pending'
  )
);

-- Create policy for viewing feedback (only for the request owner)
CREATE POLICY "anon_view_feedback_responses"
ON feedback_responses
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM feedback_requests fr
    WHERE fr.id = feedback_request_id
  )
); 