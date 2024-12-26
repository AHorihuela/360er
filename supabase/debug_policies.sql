-- List all policies for feedback_responses
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'feedback_responses'
ORDER BY policyname;

-- List all policies for feedback_requests
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'feedback_requests'
ORDER BY policyname;

-- Check permissions for anon role
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE grantee = 'anon'
AND table_schema = 'public'
AND table_name IN ('feedback_responses', 'feedback_requests', 'employees', 'review_cycles')
ORDER BY table_name, privilege_type;

-- Check if RLS is enabled
SELECT 
    tablename,
    relrowsecurity as rls_enabled
FROM pg_tables t
JOIN pg_class c ON t.tablename = c.relname
WHERE schemaname = 'public' 
AND tablename IN ('feedback_responses', 'feedback_requests');

-- List all tables with their RLS status
SELECT 
    schemaname,
    tablename,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
FROM pg_tables t
JOIN pg_class c ON t.tablename = c.relname
WHERE schemaname = 'public'
ORDER BY tablename; 