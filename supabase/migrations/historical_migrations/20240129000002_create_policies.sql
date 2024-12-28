-- Employees policies
CREATE POLICY "Users can view their employees"
ON employees FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their employees"
ON employees FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their employees"
ON employees FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their employees"
ON employees FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Review Cycles policies
CREATE POLICY "Users can view their own review cycles"
ON review_cycles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own review cycles"
ON review_cycles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own review cycles"
ON review_cycles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own review cycles"
ON review_cycles FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Feedback Requests policies
CREATE POLICY "Users can view feedback requests for their review cycles"
ON feedback_requests FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM review_cycles rc
        WHERE rc.id = review_cycle_id
        AND rc.user_id = auth.uid()
    )
);

CREATE POLICY "Anyone can view feedback requests by unique link"
ON feedback_requests FOR SELECT
TO anon
USING (true);

CREATE POLICY "Users can create feedback requests for their review cycles"
ON feedback_requests FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM review_cycles rc
        WHERE rc.id = review_cycle_id
        AND rc.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update feedback requests for their review cycles"
ON feedback_requests FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM review_cycles rc
        WHERE rc.id = review_cycle_id
        AND rc.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM review_cycles rc
        WHERE rc.id = review_cycle_id
        AND rc.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete feedback requests for their review cycles"
ON feedback_requests FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM review_cycles rc
        WHERE rc.id = review_cycle_id
        AND rc.user_id = auth.uid()
    )
);

-- Feedback Responses policies
CREATE POLICY "Anyone can create feedback responses"
ON feedback_responses FOR INSERT
TO anon
WITH CHECK (
    feedback_request_id IN (
        SELECT id FROM feedback_requests WHERE status = 'pending'
    )
);

CREATE POLICY "Users can view feedback responses for their requests"
ON feedback_responses FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM feedback_requests fr
        JOIN review_cycles rc ON rc.id = fr.review_cycle_id
        WHERE fr.id = feedback_responses.feedback_request_id
        AND rc.user_id = auth.uid()
    )
);

-- AI Reports policies
CREATE POLICY "Users can view their own AI reports"
ON ai_reports FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM feedback_requests fr
        JOIN review_cycles rc ON fr.review_cycle_id = rc.id
        WHERE fr.id = ai_reports.feedback_request_id
        AND rc.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create AI reports for their feedback requests"
ON ai_reports FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM feedback_requests fr
        JOIN review_cycles rc ON fr.review_cycle_id = rc.id
        WHERE fr.id = ai_reports.feedback_request_id
        AND rc.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own AI reports"
ON ai_reports FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM feedback_requests fr
        JOIN review_cycles rc ON fr.review_cycle_id = rc.id
        WHERE fr.id = ai_reports.feedback_request_id
        AND rc.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM feedback_requests fr
        JOIN review_cycles rc ON fr.review_cycle_id = rc.id
        WHERE fr.id = ai_reports.feedback_request_id
        AND rc.user_id = auth.uid()
    )
); 