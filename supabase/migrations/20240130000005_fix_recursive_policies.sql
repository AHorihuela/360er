-- First, backup all existing policies
DO $$
BEGIN
    CREATE TABLE IF NOT EXISTS policy_backup_20240130_full AS
    SELECT * FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('feedback_requests', 'employees', 'review_cycles', 'feedback_responses');
    
    RAISE NOTICE 'Existing policies backed up';
END $$;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "view_feedback_requests_by_unique_link" ON feedback_requests;
DROP POLICY IF EXISTS "users_view_own_feedback_requests" ON feedback_requests;
DROP POLICY IF EXISTS "view_employees_by_feedback_link" ON employees;
DROP POLICY IF EXISTS "users_view_own_employees" ON employees;
DROP POLICY IF EXISTS "view_review_cycles_by_feedback_link" ON review_cycles;
DROP POLICY IF EXISTS "users_view_own_review_cycles" ON review_cycles;

-- Create new non-recursive policies

-- 1. Feedback Requests policies
CREATE POLICY "view_feedback_requests_by_unique_link"
ON feedback_requests
FOR SELECT
TO public
USING (unique_link IS NOT NULL);

CREATE POLICY "users_view_own_feedback_requests"
ON feedback_requests
FOR SELECT
TO authenticated
USING (
    review_cycle_id IN (
        SELECT id FROM review_cycles
        WHERE user_id = auth.uid()
    )
);

-- 2. Employees policies
CREATE POLICY "view_employees_by_feedback_link"
ON employees
FOR SELECT
TO public
USING (
    id IN (
        SELECT employee_id 
        FROM feedback_requests 
        WHERE unique_link IS NOT NULL
    )
);

CREATE POLICY "users_view_own_employees"
ON employees
FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT employee_id 
        FROM feedback_requests fr
        JOIN review_cycles rc ON rc.id = fr.review_cycle_id
        WHERE rc.user_id = auth.uid()
    )
);

-- 3. Review Cycles policies
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

CREATE POLICY "users_view_own_review_cycles"
ON review_cycles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Ensure proper permissions
GRANT SELECT ON feedback_requests TO anon;
GRANT SELECT ON feedback_requests TO authenticated;
GRANT SELECT ON employees TO anon;
GRANT SELECT ON employees TO authenticated;
GRANT SELECT ON review_cycles TO anon;
GRANT SELECT ON review_cycles TO authenticated;

-- Verify the changes
DO $$
BEGIN
    -- Check if policies were created
    IF EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('feedback_requests', 'employees', 'review_cycles')
        AND policyname IN (
            'view_feedback_requests_by_unique_link',
            'users_view_own_feedback_requests',
            'view_employees_by_feedback_link',
            'users_view_own_employees',
            'view_review_cycles_by_feedback_link',
            'users_view_own_review_cycles'
        )
    ) THEN
        RAISE NOTICE 'New policies created successfully';
    ELSE
        RAISE NOTICE 'Warning: Some policies may be missing';
    END IF;
    
    -- Verify permissions
    IF EXISTS (
        SELECT 1 
        FROM information_schema.role_table_grants 
        WHERE table_name IN ('feedback_requests', 'employees', 'review_cycles')
        AND grantee IN ('anon', 'authenticated')
        AND privilege_type = 'SELECT'
    ) THEN
        RAISE NOTICE 'Permissions verified';
    ELSE
        RAISE NOTICE 'Warning: Permissions may not be set correctly';
    END IF;
END $$; 