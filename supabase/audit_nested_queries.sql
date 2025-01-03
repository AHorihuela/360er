-- 1. Check all foreign key relationships and their policies
WITH fk_relationships AS (
    SELECT
        tc.table_schema, 
        tc.table_name,
        kcu.column_name,
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
)
SELECT 
    fk.table_name,
    fk.column_name,
    fk.foreign_table_name,
    fk.foreign_column_name,
    p.policyname,
    p.cmd,
    p.qual as policy_condition
FROM fk_relationships fk
LEFT JOIN pg_policies p 
    ON p.schemaname = 'public' 
    AND p.tablename = fk.table_name
ORDER BY fk.table_name, p.policyname;

-- 2. Check policies that might cause recursion
WITH RECURSIVE policy_dependencies AS (
    -- Base case: direct dependencies through policy conditions
    SELECT DISTINCT
        p1.tablename as dependent_table,
        regexp_matches(p1.qual::text, 'FROM\s+([a-zA-Z_]+)', 'g') as referenced_table,
        1 as level,
        ARRAY[p1.tablename] as path,
        p1.policyname,
        p1.qual::text as policy_condition
    FROM pg_policies p1
    WHERE p1.schemaname = 'public'
    
    UNION ALL
    
    -- Recursive case
    SELECT 
        pd.dependent_table,
        regexp_matches(p2.qual::text, 'FROM\s+([a-zA-Z_]+)', 'g') as referenced_table,
        pd.level + 1,
        pd.path || p2.tablename,
        p2.policyname,
        p2.qual::text as policy_condition
    FROM policy_dependencies pd
    JOIN pg_policies p2 
        ON p2.schemaname = 'public' 
        AND p2.tablename = pd.referenced_table[1]
    WHERE NOT p2.tablename = ANY(pd.path)
    AND pd.level < 5
)
SELECT *
FROM policy_dependencies
WHERE array_length(path, 1) > 1
ORDER BY level, dependent_table;

-- 3. Check specific nested query access
SELECT
    p.schemaname,
    p.tablename,
    p.policyname,
    p.cmd,
    p.roles,
    p.qual as policy_condition
FROM pg_policies p
WHERE p.schemaname = 'public'
AND (
    p.qual::text LIKE '%JOIN%'
    OR p.qual::text LIKE '%IN (SELECT%'
    OR p.qual::text LIKE '%EXISTS%'
)
ORDER BY p.tablename, p.policyname;

-- 4. Check table dependencies through foreign keys
WITH RECURSIVE table_deps AS (
    SELECT DISTINCT
        tc.table_name as dependent_table,
        ccu.table_name as referenced_table,
        1 as level,
        ARRAY[tc.table_name] as path
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    
    UNION ALL
    
    SELECT
        td.dependent_table,
        ccu.table_name,
        td.level + 1,
        td.path || ccu.table_name
    FROM table_deps td
    JOIN information_schema.table_constraints tc
        ON tc.table_name = td.referenced_table
    JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND NOT ccu.table_name = ANY(td.path)
    AND td.level < 5
)
SELECT *
FROM table_deps
WHERE array_length(path, 1) > 1
ORDER BY level, dependent_table;

-- 5. Check for circular references in views
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
AND definition LIKE '%JOIN%'
ORDER BY viewname; 