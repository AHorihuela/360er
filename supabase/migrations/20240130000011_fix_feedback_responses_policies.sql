-- Backup existing policies
CREATE TABLE IF NOT EXISTS policy_backup_20240130_responses AS
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'feedback_responses';

-- Drop existing policies
DROP POLICY IF EXISTS "Allow anonymous feedback submission" ON feedback_responses;
DROP POLICY IF EXISTS "Users can delete feedback responses for their requests" ON feedback_responses;
DROP POLICY IF EXISTS "Users can view feedback responses for their requests" ON feedback_responses;
DROP POLICY IF EXISTS "anon_view_feedback_responses" ON feedback_responses;

-- Create new non-circular policies
-- Anonymous access through unique_link
CREATE POLICY "feedback_responses_anon_access"
ON feedback_responses
FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM feedback_requests
        WHERE id = feedback_responses.feedback_request_id
        AND unique_link IS NOT NULL
    )
);

-- Anonymous submission through unique_link
CREATE POLICY "feedback_responses_anon_submit"
ON feedback_responses
FOR INSERT
TO public
WITH CHECK (
    EXISTS (
        SELECT 1 FROM feedback_requests
        WHERE id = feedback_request_id
        AND unique_link IS NOT NULL
        AND status != 'closed'
        AND review_cycle_id IN (
            SELECT id FROM review_cycles
            WHERE review_by_date >= CURRENT_DATE
        )
    )
);

-- Authenticated user access
CREATE POLICY "feedback_responses_auth_access"
ON feedback_responses
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM feedback_requests
        WHERE id = feedback_responses.feedback_request_id
        AND review_cycle_id IN (
            SELECT id FROM review_cycles
            WHERE user_id = auth.uid()
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM feedback_requests
        WHERE id = feedback_request_id
        AND review_cycle_id IN (
            SELECT id FROM review_cycles
            WHERE user_id = auth.uid()
        )
    )
);

-- Verify permissions
DO $$
BEGIN
    -- Check if policies exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'feedback_responses'
        AND policyname IN (
            'feedback_responses_anon_access',
            'feedback_responses_anon_submit',
            'feedback_responses_auth_access'
        )
    ) THEN
        RAISE EXCEPTION 'Policy creation failed';
    END IF;

    -- Ensure proper permissions
    GRANT SELECT, INSERT ON feedback_responses TO anon;
    GRANT ALL ON feedback_responses TO authenticated;
END $$; 