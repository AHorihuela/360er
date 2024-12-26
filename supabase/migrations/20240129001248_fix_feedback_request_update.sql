-- Grant UPDATE permission on feedback_requests to anon
GRANT UPDATE ON feedback_requests TO anon;

-- Create policy for updating feedback request status
CREATE POLICY "anon_update_feedback_request_status"
ON feedback_requests
FOR UPDATE
TO anon
USING (unique_link IS NOT NULL)
WITH CHECK (unique_link IS NOT NULL);

-- Only allow updating the status column
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY; 