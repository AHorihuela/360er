-- Add policy for anonymous users to submit feedback responses
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
        AND fr.status = 'in_progress'
        AND fr.unique_link IS NOT NULL
    )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Grant INSERT permission on feedback_responses to anonymous users
GRANT INSERT ON feedback_responses TO anon; 