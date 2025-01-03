-- First backup existing policies
CREATE TABLE IF NOT EXISTS policy_backup_20240130_feedback_final AS
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'feedback_requests';

-- Drop existing policies
DROP POLICY IF EXISTS "feedback_requests_auth_access" ON feedback_requests;
DROP POLICY IF EXISTS "feedback_requests_anon_access" ON feedback_requests;
DROP POLICY IF EXISTS "feedback_requests_anon_update" ON feedback_requests;

-- Clear permissions
REVOKE ALL ON feedback_requests FROM anon, authenticated;

-- Create base policy for authenticated users (managers)
CREATE POLICY "feedback_requests_auth_access"
ON feedback_requests
FOR ALL
TO authenticated
USING (
    -- Direct access through review cycle ownership
    review_cycle_id IN (
        SELECT id FROM review_cycles
        WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    review_cycle_id IN (
        SELECT id FROM review_cycles
        WHERE user_id = auth.uid()
    )
);

-- Create policy for anonymous SELECT access through unique link
CREATE POLICY "feedback_requests_anon_select"
ON feedback_requests
FOR SELECT
TO public
USING (unique_link IS NOT NULL);

-- Create policy for anonymous UPDATE access (to mark as submitted)
CREATE POLICY "feedback_requests_anon_update"
ON feedback_requests
FOR UPDATE
TO public
USING (
    unique_link IS NOT NULL 
    AND status = 'pending'
)
WITH CHECK (status = 'submitted');

-- Grant minimum necessary permissions
GRANT SELECT, UPDATE ON feedback_requests TO anon;
GRANT ALL ON feedback_requests TO authenticated;

-- Verify policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'feedback_requests'
        AND policyname IN (
            'feedback_requests_auth_access',
            'feedback_requests_anon_select',
            'feedback_requests_anon_update'
        )
    ) THEN
        RAISE EXCEPTION 'Missing policies on feedback_requests table';
    END IF;
END
$$; 