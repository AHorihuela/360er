-- Drop existing policies
DROP POLICY IF EXISTS "anon_submit_feedback_responses" ON feedback_responses;
DROP POLICY IF EXISTS "anon_view_feedback_responses" ON feedback_responses;

-- Create maximally permissive policies for testing
DO $$ BEGIN
CREATE POLICY "anon_all_feedback_responses"
ON feedback_responses
FOR ALL
TO anon
USING (true)
WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Grant all permissions for testing
GRANT ALL ON feedback_responses TO anon;

-- Ensure RLS is enabled
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY; 