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

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own AI reports" ON ai_reports;
DROP POLICY IF EXISTS "Users can create AI reports for their feedback requests" ON ai_reports;
DROP POLICY IF EXISTS "Users can update their own AI reports" ON ai_reports;

-- Create more permissive SELECT policy
CREATE POLICY "Users can view AI reports for their feedback requests"
ON ai_reports FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM feedback_requests fr
        JOIN review_cycles rc ON fr.review_cycle_id = rc.id
        WHERE fr.id = ai_reports.feedback_request_id
        AND (rc.user_id = auth.uid() OR fr.unique_link IS NOT NULL)
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