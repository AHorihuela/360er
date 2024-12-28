-- Add delete permissions for feedback_responses
CREATE POLICY "users_delete_own_feedback_responses"
ON feedback_responses
FOR DELETE
TO authenticated
USING (
  feedback_request_id IN (
    SELECT fr.id 
    FROM feedback_requests fr
    JOIN review_cycles rc ON fr.review_cycle_id = rc.id
    WHERE rc.created_by = auth.uid()
  )
);

-- Add delete permissions for feedback_requests
CREATE POLICY "users_delete_own_feedback_requests"
ON feedback_requests
FOR DELETE
TO authenticated
USING (
  review_cycle_id IN (
    SELECT id FROM review_cycles
    WHERE created_by = auth.uid()
  )
);

-- Add delete permissions for feedback_analyses
CREATE POLICY "users_delete_own_feedback_analyses"
ON feedback_analyses
FOR DELETE
TO authenticated
USING (
  id IN (
    SELECT fa.id
    FROM feedback_analyses fa
    JOIN feedback_responses fr ON fa.strengths = fr.strengths
    JOIN feedback_requests freq ON fr.feedback_request_id = freq.id
    JOIN review_cycles rc ON freq.review_cycle_id = rc.id
    WHERE rc.created_by = auth.uid()
  )
); 