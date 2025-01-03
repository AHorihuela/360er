-- First, backup existing policies
DO $$
BEGIN
    CREATE TABLE IF NOT EXISTS policy_backup_20240130 AS
    SELECT * FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'review_cycles';
    
    RAISE NOTICE 'Existing policies backed up';
END $$;

-- Drop the policy if it exists (to avoid duplicate)
DROP POLICY IF EXISTS "view_review_cycles_by_feedback_link" ON review_cycles;

-- Add new policy for feedback link access
CREATE POLICY "view_review_cycles_by_feedback_link"
ON review_cycles
FOR SELECT
TO public
USING (
    id IN (
        SELECT review_cycle_id 
        FROM feedback_requests 
        WHERE unique_link IS NOT NULL
    )
);

-- Ensure proper permissions are granted (these are additive)
GRANT SELECT ON review_cycles TO anon;
GRANT SELECT ON review_cycles TO authenticated;

-- Verify the changes
DO $$
BEGIN
    -- Check if the new policy was created
    IF EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'review_cycles'
        AND policyname = 'view_review_cycles_by_feedback_link'
    ) THEN
        RAISE NOTICE 'New policy created successfully';
    ELSE
        RAISE NOTICE 'Warning: New policy not found';
    END IF;
    
    -- Verify permissions
    IF EXISTS (
        SELECT 1 
        FROM information_schema.role_table_grants 
        WHERE table_name = 'review_cycles'
        AND grantee IN ('anon', 'authenticated')
        AND privilege_type = 'SELECT'
    ) THEN
        RAISE NOTICE 'Permissions verified';
    ELSE
        RAISE NOTICE 'Warning: Permissions may not be set correctly';
    END IF;
END $$; 