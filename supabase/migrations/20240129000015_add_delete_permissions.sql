-- Add delete permissions for feedback_responses
CREATE POLICY "users_delete_own_feedback_responses"
ON feedback_responses
FOR DELETE
TO authenticated
USING (
  feedback_request_id IN (
    SELECT id FROM feedback_requests
    WHERE user_id = auth.uid()
  )
);

-- Add delete permissions for feedback_requests
CREATE POLICY "users_delete_own_feedback_requests"
ON feedback_requests
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Add delete permissions for feedback_analyses
CREATE POLICY "users_delete_own_feedback_analyses"
ON feedback_analyses
FOR DELETE
TO authenticated
USING (
  strengths IN (
    SELECT strengths FROM feedback_responses
    WHERE feedback_request_id IN (
      SELECT id FROM feedback_requests
      WHERE user_id = auth.uid()
    )
  )
); 