-- Add policy for anonymous users to view feedback responses
DO $$ BEGIN
CREATE POLICY "anon_view_feedback_responses"
ON feedback_responses
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 
        FROM feedback_requests fr
        WHERE fr.id = feedback_responses.feedback_request_id
        AND fr.unique_link IS NOT NULL
    )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Grant SELECT permission on feedback_responses to anonymous users
GRANT SELECT ON feedback_responses TO anon; 