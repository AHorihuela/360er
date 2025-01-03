-- 1. Get all tables and their RLS status
SELECT 
    schemaname,
    tablename,
    hasrls as rls_enabled,
    rowsecurity as row_level_security_enforced
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Get all existing policies and their definitions
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as policy_condition,
    with_check as insert_update_condition
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Get all table permissions
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

-- 4. Get foreign key relationships
SELECT
    tc.table_schema, 
    tc.table_name as table_name, 
    kcu.column_name as column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 5. Get indexes
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 6. Get table dependencies through foreign keys
WITH RECURSIVE table_deps AS (
    -- Base case: tables with foreign keys
    SELECT DISTINCT
        tc.table_name as dependent_table,
        ccu.table_name as referenced_table,
        1 as level
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    
    UNION ALL
    
    -- Recursive case: follow the chain of dependencies
    SELECT
        td.dependent_table,
        ccu.table_name,
        td.level + 1
    FROM table_deps td
    JOIN information_schema.table_constraints tc
        ON tc.table_name = td.referenced_table
    JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND td.level < 5  -- Prevent infinite recursion
)
SELECT
    dependent_table,
    referenced_table,
    level
FROM table_deps
ORDER BY level, dependent_table, referenced_table;

-- 7. Get specific policies for our key tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as policy_condition,
    with_check as insert_update_condition
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('feedback_requests', 'review_cycles', 'employees', 'feedback_responses')
ORDER BY tablename, policyname; 