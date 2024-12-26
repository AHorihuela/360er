-- Check RLS policies
SELECT schemaname,
       tablename,
       policyname,
       permissive,
       roles,
       cmd,
       qual,
       with_check
FROM pg_policies
WHERE tablename IN ('feedback_responses', 'feedback_requests', 'employees', 'review_cycles', 'page_views')
ORDER BY tablename, cmd;

-- Check permissions
SELECT grantee,
       table_schema,
       table_name,
       privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
AND table_name IN ('feedback_responses', 'feedback_requests', 'employees', 'review_cycles', 'page_views')
ORDER BY table_name, privilege_type;

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('feedback_responses', 'feedback_requests', 'employees', 'review_cycles', 'page_views');

-- Check specific feedback request
SELECT fr.id,
       fr.status,
       fr.unique_link,
       fr.employee_id,
       fr.review_cycle_id,
       e.name as employee_name,
       rc.title as review_cycle_title
FROM feedback_requests fr
LEFT JOIN employees e ON e.id = fr.employee_id
LEFT JOIN review_cycles rc ON rc.id = fr.review_cycle_id
WHERE fr.unique_link = 'jBa26kdzeHqO';

-- Check if the feedback request is accessible via RLS
SELECT has_table_privilege('anon', 'feedback_requests', 'SELECT') as can_select_requests,
       has_table_privilege('anon', 'employees', 'SELECT') as can_select_employees,
       has_table_privilege('anon', 'review_cycles', 'SELECT') as can_select_cycles;

-- Check schema permissions
SELECT has_schema_privilege('anon', 'public', 'USAGE') as has_schema_usage; 