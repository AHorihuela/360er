-- 1. Check RLS status
SELECT tablename, relrowsecurity as rls_enabled
FROM pg_tables pt
JOIN pg_class pc ON pt.tablename::regclass = pc.oid
WHERE schemaname = 'public' AND tablename = 'employees';

-- 2. Check all policies on employees table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual::text as policy_using,
    with_check::text as policy_with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'employees'
ORDER BY policyname;

-- 3. Check permissions
SELECT 
    grantee,
    string_agg(privilege_type, ', ') as privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name = 'employees'
AND grantee IN ('anon', 'authenticated', 'service_role')
GROUP BY grantee;

-- 4. Check foreign key relationships
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND (tc.table_name = 'employees' OR ccu.table_name = 'employees')
AND tc.table_schema = 'public';

-- 5. Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'employees'
ORDER BY ordinal_position;

-- 6. Check for any recursive policies
WITH RECURSIVE policy_refs AS (
    SELECT DISTINCT
        p1.tablename as policy_table,
        p1.policyname,
        (regexp_matches(
            p1.qual::text || ' ' ||
            COALESCE(p1.with_check::text, ''),
            'FROM\s+([a-zA-Z_]+)',
            'g'
        ))[1] as referenced_table,
        1 as level,
        ARRAY[p1.tablename] as path
    FROM pg_policies p1
    WHERE p1.schemaname = 'public'
    AND (p1.tablename = 'employees' OR p1.qual::text LIKE '%employees%')
    
    UNION ALL
    
    SELECT
        pr.policy_table,
        p2.policyname,
        (regexp_matches(
            p2.qual::text || ' ' ||
            COALESCE(p2.with_check::text, ''),
            'FROM\s+([a-zA-Z_]+)',
            'g'
        ))[1] as referenced_table,
        pr.level + 1,
        pr.path || pr.referenced_table
    FROM policy_refs pr
    JOIN pg_policies p2 
        ON p2.schemaname = 'public'
        AND p2.tablename = pr.referenced_table
    WHERE NOT pr.referenced_table = ANY(pr.path)
    AND pr.level < 5
)
SELECT * FROM policy_refs 
WHERE array_length(path, 1) > 1
ORDER BY level, policy_table;

-- 7. Test specific access patterns
SELECT EXISTS (
    SELECT 1 FROM employees 
    WHERE user_id = 'cb093adc-a2dd-4535-93ba-1e81dcb7d7ce'
) as should_have_access;

-- 8. Check for any triggers that might affect access
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'employees'; 