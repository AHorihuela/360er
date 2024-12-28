-- Grant INSERT permission on feedback_analyses to anon role
GRANT INSERT ON feedback_analyses TO anon;

-- Ensure RLS is enabled
ALTER TABLE feedback_analyses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous users to create analyses
CREATE POLICY "anon_insert_feedback_analyses"
ON feedback_analyses
FOR INSERT
TO anon
WITH CHECK (true);

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO anon; 