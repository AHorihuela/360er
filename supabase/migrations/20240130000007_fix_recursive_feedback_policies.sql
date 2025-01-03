-- First, backup existing policies
DO $$
BEGIN
    CREATE TABLE IF NOT EXISTS policy_backup_20240130_feedback AS
    SELECT * FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('feedback_requests', 'review_cycles');
    
    RAISE NOTICE 'Existing policies backed up';
END $$;

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "view_feedback_requests_by_unique_link" ON feedback_requests;
DROP POLICY IF EXISTS "users_view_own_feedback_requests" ON feedback_requests;
DROP POLICY IF EXISTS "users_view_review_cycles" ON review_cycles;

-- Create non-recursive policy for feedback requests
CREATE POLICY "view_feedback_requests_by_unique_link"
ON feedback_requests
FOR SELECT
TO public
USING (
    unique_link IS NOT NULL
);

-- Create policy for authenticated users
CREATE POLICY "users_view_own_feedback_requests"
ON feedback_requests
FOR SELECT
TO authenticated
USING (
    review_cycle_id IN (
        SELECT id FROM review_cycles WHERE user_id = auth.uid()
    )
);

-- Create policy for review cycles
CREATE POLICY "users_view_review_cycles"
ON review_cycles
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);

-- Ensure proper permissions
GRANT SELECT ON feedback_requests TO anon;
GRANT SELECT ON feedback_requests TO authenticated;
GRANT SELECT ON review_cycles TO authenticated;

-- Verify the changes
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'feedback_requests'
        AND policyname IN (
            'view_feedback_requests_by_unique_link',
            'users_view_own_feedback_requests'
        )
    ) THEN
        RAISE NOTICE 'Feedback request policies created successfully';
    ELSE
        RAISE NOTICE 'Warning: Some feedback request policies may be missing';
    END IF;
END $$; 