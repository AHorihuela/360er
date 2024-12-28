-- Drop existing policies
DROP POLICY IF EXISTS "anon_submit_feedback_responses" ON feedback_responses;
DROP POLICY IF EXISTS "anon_view_feedback_responses" ON feedback_responses;
DROP POLICY IF EXISTS "anon_all_feedback_responses" ON feedback_responses;

-- Create policies with proper status checking
DO $$ BEGIN
CREATE POLICY "anon_submit_feedback_responses"
ON feedback_responses
FOR INSERT
TO anon
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM feedback_requests fr
        WHERE fr.id = feedback_request_id
        AND fr.status = 'in_progress'  -- Only allow submissions for in_progress requests
        AND fr.unique_link IS NOT NULL
    )
);

CREATE POLICY "anon_view_feedback_responses"
ON feedback_responses
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 
        FROM feedback_requests fr
        WHERE fr.id = feedback_request_id
        AND fr.unique_link IS NOT NULL
    )
);

EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Grant necessary permissions
REVOKE ALL ON feedback_responses FROM anon;
GRANT INSERT, SELECT ON feedback_responses TO anon; 