-- Test the policy syntax and dependencies
DO $$
BEGIN
    RAISE NOTICE '=== Testing Policy Dependencies ===';
    
    -- Verify table structure
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'feedback_requests'
    ) THEN
        RAISE NOTICE 'feedback_requests table exists';
    END IF;
    
    -- Verify columns
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'feedback_requests' 
        AND column_name = 'unique_link'
    ) THEN
        RAISE NOTICE 'unique_link column exists';
    END IF;
    
    -- Verify foreign keys
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'feedback_requests'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        RAISE NOTICE 'Foreign key constraints exist';
    END IF;
END $$;

-- Test the new policy syntax
DO $$
BEGIN
    RAISE NOTICE '=== Testing Proposed Policy Changes ===';
    
    -- Create test table
    CREATE TEMP TABLE IF NOT EXISTS test_feedback_requests (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        review_cycle_id uuid,
        employee_id uuid,
        unique_link text,
        status text
    );
    
    -- Test policy creation
    CREATE POLICY test_view_feedback_requests_by_unique_link
    ON test_feedback_requests
    FOR SELECT
    TO public
    USING (unique_link IS NOT NULL);
    
    CREATE POLICY test_users_view_own_feedback_requests
    ON test_feedback_requests
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM review_cycles rc
            WHERE rc.id = review_cycle_id
            AND rc.user_id = auth.uid()
        )
    );
    
    RAISE NOTICE 'Policy syntax verification successful';
    
    -- Cleanup
    DROP TABLE IF EXISTS test_feedback_requests;
END $$;

-- List all affected tables and their dependencies
SELECT
    tc.table_schema, 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.constraint_column_usage AS ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE 
    tc.table_name IN ('feedback_requests', 'feedback_responses', 'review_cycles')
ORDER BY tc.table_name; 

-- Check all current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- Check table permissions
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee;

-- Check existing triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY event_object_table, trigger_name; 