-- 1. Check current public access policies
SELECT 
    tablename,
    policyname,
    roles,
    cmd,
    qual as policy_condition
FROM pg_policies 
WHERE schemaname = 'public'
AND roles::text[] && ARRAY['public']
ORDER BY tablename;

-- 2. Check permissions for anon role
SELECT 
    table_schema,
    table_name,
    grantee,
    string_agg(privilege_type, ', ') as privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND grantee = 'anon'
GROUP BY table_schema, table_name, grantee
ORDER BY table_name;

-- 3. Test feedback request access chain
WITH RECURSIVE access_chain AS (
    -- Start with feedback_requests
    SELECT 
        'feedback_requests'::text as table_name,
        1 as level,
        EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'feedback_requests'
            AND roles::text[] && ARRAY['public']
            AND cmd = 'SELECT'
        ) as has_public_access,
        ARRAY['feedback_requests'] as path
    
    UNION ALL
    
    -- Follow foreign key relationships
    SELECT 
        fk.foreign_table_name,
        ac.level + 1,
        EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = fk.foreign_table_name
            AND roles::text[] && ARRAY['public']
            AND cmd = 'SELECT'
        ) as has_public_access,
        ac.path || fk.foreign_table_name
    FROM access_chain ac
    JOIN (
        SELECT DISTINCT tc.table_name, ccu.table_name as foreign_table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    ) fk ON fk.table_name = ac.table_name
    WHERE NOT fk.foreign_table_name = ANY(ac.path)
    AND ac.level < 5
)
SELECT * FROM access_chain ORDER BY level;

-- 4. Check for missing public access
SELECT 
    tc.table_name,
    ccu.table_name as referenced_table,
    NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = tc.table_name
        AND roles::text[] && ARRAY['public']
        AND cmd = 'SELECT'
    ) as missing_public_access
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND (
    tc.table_name IN ('feedback_requests', 'review_cycles', 'employees')
    OR ccu.table_name IN ('feedback_requests', 'review_cycles', 'employees')
); 