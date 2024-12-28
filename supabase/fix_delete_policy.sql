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

-- Add delete policy for employees
CREATE POLICY "Users can delete their own employees"
ON employees FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Add delete policy for feedback requests when deleting employees
CREATE POLICY "Users can delete feedback requests for their employees"
ON feedback_requests FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM employees e
        WHERE e.id = feedback_requests.employee_id
        AND e.user_id = auth.uid()
    )
);

-- Grant delete permissions
GRANT DELETE ON feedback_responses TO authenticated;
GRANT DELETE ON employees TO authenticated;
GRANT DELETE ON feedback_requests TO authenticated; 