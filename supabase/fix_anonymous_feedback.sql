-- Drop existing anonymous feedback policies
DROP POLICY IF EXISTS "Anyone can submit feedback responses" ON feedback_responses;
DROP POLICY IF EXISTS "Anyone can view their submitted feedback" ON feedback_responses;
DROP POLICY IF EXISTS "Anyone can view feedback requests by unique_link" ON feedback_requests;

-- Create more permissive policies for anonymous feedback
CREATE POLICY "Anyone can view feedback requests by unique_link"
ON feedback_requests
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anyone can submit feedback responses"
ON feedback_responses
FOR INSERT
TO anon
WITH CHECK (
    feedback_request_id IN (
        SELECT id FROM feedback_requests WHERE status = 'pending'
    )
);

CREATE POLICY "Anyone can view their submitted feedback"
ON feedback_responses
FOR SELECT
TO anon
USING (true);

-- Add policy for feedback request status updates
CREATE POLICY "Anyone can update feedback request status"
ON feedback_requests
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY; 