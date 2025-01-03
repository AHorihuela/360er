-- First, backup existing policies
DO $$
BEGIN
    CREATE TABLE IF NOT EXISTS policy_backup_20240130_employees AS
    SELECT * FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'employees';
    
    RAISE NOTICE 'Existing policies backed up';
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "view_employees_by_feedback_link" ON employees;
DROP POLICY IF EXISTS "users_view_own_employees" ON employees;

-- Create new policies for employees
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
    user_id = auth.uid()
    OR id IN (
        SELECT employee_id 
        FROM feedback_requests fr
        JOIN review_cycles rc ON rc.id = fr.review_cycle_id
        WHERE rc.user_id = auth.uid()
    )
);

-- Ensure proper permissions
GRANT SELECT ON employees TO anon;
GRANT SELECT ON employees TO authenticated;

-- Verify the changes
DO $$
BEGIN
    -- Check if policies were created
    IF EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'employees'
        AND policyname IN (
            'view_employees_by_feedback_link',
            'users_view_own_employees'
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
        WHERE table_name = 'employees'
        AND grantee IN ('anon', 'authenticated')
        AND privilege_type = 'SELECT'
    ) THEN
        RAISE NOTICE 'Permissions verified';
    ELSE
        RAISE NOTICE 'Warning: Permissions may not be set correctly';
    END IF;
END $$; 