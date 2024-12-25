-- Add delete policy for feedback responses
CREATE POLICY "Users can delete feedback responses for their requests"
ON feedback_responses FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM feedback_requests fr
        JOIN review_cycles rc ON rc.id = fr.review_cycle_id
        WHERE fr.id = feedback_responses.feedback_request_id
        AND rc.user_id = auth.uid()
    )
);

-- Grant delete permission to authenticated users
GRANT DELETE ON feedback_responses TO authenticated; 