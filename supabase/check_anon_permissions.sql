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