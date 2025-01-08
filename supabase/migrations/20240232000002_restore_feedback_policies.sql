-- Restore original working policies for feedback responses
DROP POLICY IF EXISTS "Anonymous users can insert feedback responses" ON feedback_responses;
DROP POLICY IF EXISTS "Anonymous users can update their in-progress responses" ON feedback_responses;
DROP POLICY IF EXISTS "Anonymous users can view their own responses" ON feedback_responses;
DROP POLICY IF EXISTS "Users can delete feedback responses for their review cycles" ON feedback_responses;
DROP POLICY IF EXISTS "Users can view feedback responses for their review cycles" ON feedback_responses;
DROP POLICY IF EXISTS "feedback_responses_anon_select" ON feedback_responses;
DROP POLICY IF EXISTS "feedback_responses_auth_delete" ON feedback_responses;
DROP POLICY IF EXISTS "feedback_responses_auth_select" ON feedback_responses;

-- Restore original policies
CREATE POLICY "feedback_responses_anon_select" ON feedback_responses
FOR SELECT TO public
USING (
    EXISTS (
        SELECT 1 FROM feedback_requests fr
        WHERE fr.id = feedback_request_id
        AND fr.unique_link IS NOT NULL
    )
);

CREATE POLICY "Anonymous users can insert feedback responses" ON feedback_responses
FOR INSERT TO public
WITH CHECK (
    EXISTS (
        SELECT 1 FROM feedback_requests fr
        WHERE fr.id = feedback_request_id
        AND fr.unique_link IS NOT NULL
        AND fr.status <> 'closed'
    )
);

CREATE POLICY "Anonymous users can update their in-progress responses" ON feedback_responses
FOR UPDATE TO public
USING (
    session_id IS NOT NULL 
    AND status = 'in_progress'
)
WITH CHECK (
    session_id IS NOT NULL 
    AND (
        status = 'in_progress' 
        OR (status = 'submitted' AND submitted_at IS NOT NULL)
    )
);

CREATE POLICY "Anonymous users can view their own responses" ON feedback_responses
FOR SELECT TO public
USING (
    session_id IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM feedback_requests fr
        WHERE fr.id = feedback_request_id
        AND fr.unique_link IS NOT NULL
    )
);

CREATE POLICY "Users can view feedback responses for their review cycles" ON feedback_responses
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM review_cycles rc
        JOIN feedback_requests fr ON fr.review_cycle_id = rc.id
        WHERE fr.id = feedback_request_id
        AND rc.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete feedback responses for their review cycles" ON feedback_responses
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM review_cycles rc
        JOIN feedback_requests fr ON fr.review_cycle_id = rc.id
        WHERE fr.id = feedback_request_id
        AND rc.user_id = auth.uid()
    )
);

-- Ensure proper permissions
GRANT SELECT, INSERT, UPDATE ON feedback_responses TO public;
GRANT SELECT, DELETE ON feedback_responses TO authenticated; 