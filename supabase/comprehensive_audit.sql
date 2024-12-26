-- 1. Table Structure
SELECT 
    t.tablename,
    array_agg(
        format('%s %s%s', 
            c.column_name, 
            c.data_type,
            CASE 
                WHEN c.is_nullable = 'NO' THEN ' NOT NULL'
                ELSE ''
            END
        )
    ) as columns
FROM pg_tables t
JOIN information_schema.columns c ON t.tablename = c.table_name
WHERE t.schemaname = 'public'
GROUP BY t.tablename
ORDER BY t.tablename;

-- 2. Foreign Keys and Relations
SELECT
    tc.table_name as table_name,
    kcu.column_name as column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 3. RLS Status and Policies
SELECT 
    t.tablename,
    c.relrowsecurity as rls_enabled,
    array_agg(DISTINCT
        format('%s (%s) TO %s: %s', 
            p.policyname,
            p.cmd,
            p.roles::text,
            CASE 
                WHEN p.cmd = 'SELECT' THEN p.qual::text
                ELSE format('USING (%s) WITH CHECK (%s)', p.qual::text, p.with_check::text)
            END
        )
    ) as policies
FROM pg_tables t
LEFT JOIN pg_class c ON t.tablename = c.relname
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
GROUP BY t.tablename, c.relrowsecurity
ORDER BY t.tablename;

-- 4. Permissions by Role
SELECT 
    grantee,
    table_name,
    array_agg(privilege_type) as privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
GROUP BY grantee, table_name
ORDER BY grantee, table_name;

-- 5. Indexes (simplified)
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 6. Test Anonymous Feedback Request Access
DO $$
DECLARE
    v_request_id uuid := '92fbee65-ff81-4d70-8c32-45a0c3ed7218';
    v_request record;
BEGIN
    -- Test as anon role
    SET ROLE anon;
    
    RAISE NOTICE '=== Testing Anonymous Access ===';
    
    -- Try to select
    BEGIN
        SELECT id, status, unique_link INTO STRICT v_request
        FROM feedback_requests
        WHERE id = v_request_id;
        
        RAISE NOTICE 'Can view feedback request: YES';
        RAISE NOTICE 'Status: %, Has unique_link: %', 
            v_request.status, 
            CASE WHEN v_request.unique_link IS NOT NULL THEN 'YES' ELSE 'NO' END;
    EXCEPTION 
        WHEN NO_DATA_FOUND THEN
            RAISE NOTICE 'Can view feedback request: NO (not found)';
        WHEN OTHERS THEN
            RAISE NOTICE 'Can view feedback request: NO (%, %)', SQLERRM, SQLSTATE;
    END;
    
    -- Try to update status
    BEGIN
        UPDATE feedback_requests 
        SET status = 'submitted'
        WHERE id = v_request_id
        AND status = 'pending'
        RETURNING status INTO v_request.status;
        
        RAISE NOTICE 'Can update status: YES (new status: %)', v_request.status;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Can update status: NO (%, %)', SQLERRM, SQLSTATE;
    END;
    
    RESET ROLE;
END $$;

-- 7. Show All Feedback Request Policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual::text as using_check,
    with_check::text as with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'feedback_requests'
ORDER BY policyname; 