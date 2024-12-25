-- 1. Check table existence and structure
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'feedback_responses'
) as feedback_responses_exists;

SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'feedback_requests'
) as feedback_requests_exists;

-- 2. Detailed column information for both tables
SELECT 
    table_name,
    column_name,
    data_type,
    column_default,
    is_nullable,
    is_identity,
    identity_generation
FROM 
    information_schema.columns 
WHERE 
    table_name IN ('feedback_responses', 'feedback_requests')
ORDER BY 
    table_name, ordinal_position;

-- 3. Check all constraints including foreign keys
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name as foreign_table_name,
    ccu.column_name as foreign_column_name
FROM 
    information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
    LEFT JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
WHERE 
    tc.table_name IN ('feedback_responses', 'feedback_requests');

-- 4. Check all triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM 
    information_schema.triggers
WHERE 
    event_object_table IN ('feedback_responses', 'feedback_requests');

-- 5. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies
WHERE 
    tablename IN ('feedback_responses', 'feedback_requests');

-- 6. Check table privileges for anon role
SELECT 
    grantee,
    table_name,
    privilege_type
FROM 
    information_schema.role_table_grants
WHERE 
    table_name IN ('feedback_responses', 'feedback_requests')
    AND grantee = 'anon';

-- 7. Check for any disabled triggers
SELECT 
    t.tgname as trigger_name,
    t.tgenabled as trigger_enabled,
    c.relname as table_name
FROM 
    pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
WHERE 
    c.relname IN ('feedback_responses', 'feedback_requests');

-- 8. Check for any sequences
SELECT 
    sequence_name,
    data_type,
    start_value,
    minimum_value,
    maximum_value,
    increment
FROM 
    information_schema.sequences
WHERE 
    sequence_schema = 'public';

-- 9. Check for any indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM 
    pg_indexes
WHERE 
    tablename IN ('feedback_responses', 'feedback_requests');

-- 10. Check for any views referencing these tables
SELECT 
    viewname,
    definition
FROM 
    pg_views
WHERE 
    definition LIKE '%feedback_responses%'
    OR definition LIKE '%feedback_requests%';

-- 11. Sample data check (limit to avoid large output)
SELECT 'feedback_responses' as table_name, COUNT(*) as row_count
FROM feedback_responses
UNION ALL
SELECT 'feedback_requests' as table_name, COUNT(*) as row_count
FROM feedback_requests;

-- 12. Check for orphaned records
SELECT COUNT(*) as orphaned_responses
FROM feedback_responses fr
LEFT JOIN feedback_requests fq ON fr.feedback_request_id = fq.id
WHERE fq.id IS NULL;

-- 13. Check UUID extension
SELECT EXISTS (
    SELECT 1 
    FROM pg_extension 
    WHERE extname = 'uuid-ossp'
) as uuid_extension_installed;

-- 14. Verify trigger functions
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM 
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE 
    n.nspname = 'public'
    AND p.proname LIKE '%feedback%'; 