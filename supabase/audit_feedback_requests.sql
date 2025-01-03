-- 1. Check RLS status
SELECT tablename, relrowsecurity as rls_enabled
FROM pg_tables pt
JOIN pg_class pc ON pt.tablename::regclass = pc.oid
WHERE schemaname = 'public' 
AND tablename IN ('feedback_requests', 'review_cycles', 'employees', 'feedback_responses');

-- 2. Check all current policies on feedback_requests and related tables
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
AND tablename IN ('feedback_requests', 'review_cycles', 'employees', 'feedback_responses')
ORDER BY tablename, policyname;

-- 3. Check permissions on all related tables
SELECT 
    table_name,
    grantee,
    string_agg(privilege_type, ', ') as privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name IN ('feedback_requests', 'review_cycles', 'employees', 'feedback_responses')
AND grantee IN ('anon', 'authenticated', 'service_role')
GROUP BY table_name, grantee
ORDER BY table_name, grantee;

-- 4. Check foreign key relationships
WITH RECURSIVE fk_tree AS (
    -- Base case: direct foreign keys from/to feedback_requests
    SELECT 
        tc.table_schema,
        tc.table_name as dependent_table,
        ccu.table_name as referenced_table,
        kcu.column_name as fk_column,
        ccu.column_name as referenced_column,
        1 as level,
        ARRAY[tc.table_name] as path
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND (tc.table_name = 'feedback_requests' OR ccu.table_name = 'feedback_requests')
    
    UNION ALL
    
    -- Recursive case: follow the chain
    SELECT 
        tc.table_schema,
        tc.table_name,
        ccu.table_name,
        kcu.column_name,
        ccu.column_name,
        ft.level + 1,
        ft.path || tc.table_name
    FROM fk_tree ft
    JOIN information_schema.table_constraints tc
        ON tc.table_schema = ft.table_schema
        AND (tc.table_name = ft.referenced_table OR tc.table_name = ft.dependent_table)
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND NOT tc.table_name = ANY(ft.path)
    AND ft.level < 5
)
SELECT * FROM fk_tree ORDER BY level, dependent_table;

-- 5. Check for circular policy references
WITH RECURSIVE policy_refs AS (
    -- Base case: direct table references in feedback_requests policies
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
        ARRAY[p1.tablename] as path,
        p1.qual::text as policy_definition
    FROM pg_policies p1
    WHERE p1.schemaname = 'public'
    AND (
        p1.tablename = 'feedback_requests' 
        OR p1.qual::text LIKE '%feedback_requests%'
        OR COALESCE(p1.with_check::text, '') LIKE '%feedback_requests%'
    )
    
    UNION ALL
    
    -- Recursive case: follow the chain of references
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
        pr.path || pr.referenced_table,
        p2.qual::text as policy_definition
    FROM policy_refs pr
    JOIN pg_policies p2 
        ON p2.schemaname = 'public'
        AND (
            p2.tablename = pr.referenced_table
            OR p2.qual::text LIKE '%' || pr.referenced_table || '%'
            OR COALESCE(p2.with_check::text, '') LIKE '%' || pr.referenced_table || '%'
        )
    WHERE NOT pr.referenced_table = ANY(pr.path)
    AND pr.level < 5
)
SELECT * FROM policy_refs 
WHERE array_length(path, 1) > 1
ORDER BY level, policy_table;

-- 6. Check for any overlapping policies
SELECT 
    t1.tablename,
    t1.policyname as policy1,
    t2.policyname as policy2,
    t1.cmd,
    t1.roles,
    t1.qual::text as policy1_using,
    t2.qual::text as policy2_using
FROM pg_policies t1
JOIN pg_policies t2 
    ON t1.tablename = t2.tablename
    AND t1.policyname < t2.policyname
    AND t1.cmd = t2.cmd
    AND t1.schemaname = 'public'
    AND t2.schemaname = 'public'
WHERE t1.tablename IN ('feedback_requests', 'review_cycles', 'employees', 'feedback_responses')
ORDER BY t1.tablename, t1.policyname;

-- 7. Test specific access patterns
SELECT EXISTS (
    SELECT 1 FROM feedback_requests 
    WHERE review_cycle_id IN (
        SELECT id FROM review_cycles 
        WHERE user_id = 'cb093adc-a2dd-4535-93ba-1e81dcb7d7ce'
    )
) as should_have_access; 