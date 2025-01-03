-- 1. Get all tables and their RLS status
SELECT 
    tablename,
    pg_catalog.has_table_privilege('anon', quote_ident(tablename), 'SELECT') as anon_select,
    pg_catalog.has_table_privilege('authenticated', quote_ident(tablename), 'SELECT') as auth_select
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Get all policies with their full definitions
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
ORDER BY tablename, policyname;

-- 3. Check for policies with JOINs or complex conditions
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual::text as policy_using
FROM pg_policies 
WHERE schemaname = 'public'
AND (
    qual::text LIKE '%JOIN%'
    OR qual::text LIKE '%EXISTS%'
    OR with_check::text LIKE '%JOIN%'
    OR with_check::text LIKE '%EXISTS%'
)
ORDER BY tablename;

-- 4. Get foreign key relationships
WITH RECURSIVE fk_tree AS (
    -- Base case: direct foreign keys
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
        AND tc.table_name = ft.referenced_table
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND NOT tc.table_name = ANY(ft.path)
    AND ft.level < 5
)
SELECT * FROM fk_tree ORDER BY level, dependent_table;

-- 5. Check for potential circular references in policies
WITH RECURSIVE policy_refs AS (
    -- Base case: direct table references in policies
    SELECT DISTINCT
        p1.tablename as policy_table,
        (regexp_matches(
            p1.qual::text || ' ' ||
            COALESCE(p1.with_check::text, ''),
            'FROM\s+([a-zA-Z_]+)',
            'g'
        ))[1] as referenced_table,
        1 as level,
        ARRAY[p1.tablename] as path,
        p1.policyname,
        p1.qual::text as policy_definition
    FROM pg_policies p1
    WHERE p1.schemaname = 'public'
    
    UNION ALL
    
    -- Recursive case: follow the chain of references
    SELECT
        pr.policy_table,
        (regexp_matches(
            p2.qual::text || ' ' ||
            COALESCE(p2.with_check::text, ''),
            'FROM\s+([a-zA-Z_]+)',
            'g'
        ))[1] as referenced_table,
        pr.level + 1,
        pr.path || pr.referenced_table,
        p2.policyname,
        p2.qual::text as policy_definition
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

-- 6. Check permissions for all roles
SELECT 
    table_schema,
    table_name,
    grantee,
    string_agg(privilege_type, ', ') as privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND grantee IN ('anon', 'authenticated', 'service_role')
GROUP BY table_schema, table_name, grantee
ORDER BY table_name, grantee;

-- 7. Check for overlapping policies on same table
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
ORDER BY t1.tablename, t1.policyname; 