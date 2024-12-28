-- Begin transaction
BEGIN;

-- First verify RLS is enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE tablename = 'ai_reports' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view AI reports for their feedback requests" ON ai_reports;
DROP POLICY IF EXISTS "Users can create AI reports for their feedback requests" ON ai_reports;
DROP POLICY IF EXISTS "Users can update their own AI reports" ON ai_reports;
DROP POLICY IF EXISTS "Anyone can view AI reports through unique link" ON ai_reports;

-- Create authenticated user policies
CREATE POLICY "Users can view AI reports for their feedback requests"
ON ai_reports FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM feedback_requests fr
        JOIN review_cycles rc ON fr.review_cycle_id = rc.id
        WHERE fr.id = ai_reports.feedback_request_id
        AND rc.user_id = auth.uid()
    )
);

-- Create anonymous access policy for unique links
CREATE POLICY "Anyone can view AI reports through unique link"
ON ai_reports FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM feedback_requests fr
        WHERE fr.id = ai_reports.feedback_request_id
        AND fr.unique_link IS NOT NULL
    )
);

-- Create INSERT policy
CREATE POLICY "Users can create AI reports for their feedback requests"
ON ai_reports FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM feedback_requests fr
        JOIN review_cycles rc ON fr.review_cycle_id = rc.id
        WHERE fr.id = ai_reports.feedback_request_id
        AND rc.user_id = auth.uid()
    )
);

-- Create UPDATE policy
CREATE POLICY "Users can update their own AI reports"
ON ai_reports FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM feedback_requests fr
        JOIN review_cycles rc ON fr.review_cycle_id = rc.id
        WHERE fr.id = ai_reports.feedback_request_id
        AND rc.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM feedback_requests fr
        JOIN review_cycles rc ON fr.review_cycle_id = rc.id
        WHERE fr.id = ai_reports.feedback_request_id
        AND rc.user_id = auth.uid()
    )
);

-- Grant necessary permissions
GRANT SELECT ON ai_reports TO anon;
GRANT SELECT ON ai_reports TO authenticated;
GRANT INSERT, UPDATE ON ai_reports TO authenticated;

-- Verify policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'ai_reports';

COMMIT; 