-- Check current policies on feedback_requests
SELECT tablename, 
       policyname, 
       permissive, 
       roles::text, 
       cmd, 
       qual::text, 
       with_check::text
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'feedback_requests'
ORDER BY policyname;

-- Check current permissions
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name = 'feedback_requests'
AND grantee = 'anon'; 