-- Drop the existing policy
DROP POLICY IF EXISTS "anon_submit_feedback_responses" ON feedback_responses;

-- Create a more permissive policy for testing
DO $$ BEGIN
CREATE POLICY "anon_submit_feedback_responses"
ON feedback_responses
FOR INSERT
TO anon
WITH CHECK (
    feedback_request_id IS NOT NULL
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Ensure all necessary permissions are granted
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON feedback_responses TO anon;

-- Enable RLS
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY; 