-- First, drop all feedback-related policies
DROP POLICY IF EXISTS "anon_submit_feedback_responses" ON feedback_responses;
DROP POLICY IF EXISTS "anon_view_feedback_responses" ON feedback_responses;
DROP POLICY IF EXISTS "anon_view_feedback_request_by_link" ON feedback_requests;

-- Create clean policies
DO $$ BEGIN
-- Policy for viewing feedback requests by link
CREATE POLICY "anon_view_feedback_request_by_link"
ON feedback_requests
FOR SELECT
TO anon
USING (unique_link IS NOT NULL);

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

-- Ensure proper permissions
REVOKE ALL ON feedback_responses FROM anon;
GRANT INSERT, SELECT ON feedback_responses TO anon;
GRANT SELECT ON feedback_requests TO anon;

-- Enable RLS
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;

-- Grant sequence access for id generation
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Verify schema access
GRANT USAGE ON SCHEMA public TO anon; 