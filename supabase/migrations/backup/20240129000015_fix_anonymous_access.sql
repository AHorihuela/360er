-- Ensure schema access
GRANT USAGE ON SCHEMA public TO anon;

-- Drop existing policies
DROP POLICY IF EXISTS "anon_submit_feedback_responses" ON feedback_responses;
DROP POLICY IF EXISTS "anon_view_feedback_responses" ON feedback_responses;

-- Create policies for anonymous access
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

-- Policy for viewing feedback responses
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

-- Grant minimal necessary permissions
GRANT INSERT, SELECT ON feedback_responses TO anon;

-- Enable RLS
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

-- Verify sequence access (needed for id generation)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon; 