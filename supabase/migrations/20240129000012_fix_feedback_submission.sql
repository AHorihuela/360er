-- Drop existing feedback response policies
DROP POLICY IF EXISTS "anon_submit_feedback_responses" ON feedback_responses;
DROP POLICY IF EXISTS "anon_view_feedback_responses" ON feedback_responses;

-- Create new policies
DO $$ BEGIN
-- Policy for submitting feedback
CREATE POLICY "anon_submit_feedback_responses"
ON feedback_responses
FOR INSERT
TO anon
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM feedback_requests fr
        WHERE fr.id = feedback_request_id
        AND fr.status = 'in_progress'
        AND fr.unique_link IS NOT NULL
    )
);

-- Policy for viewing submitted feedback (needed for the .select('*') after insert)
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

-- Ensure proper permissions
REVOKE ALL ON feedback_responses FROM anon;
GRANT INSERT, SELECT ON feedback_responses TO anon; 