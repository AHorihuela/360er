-- Check RLS status for relevant tables
SELECT tablename, relrowsecurity as rls_enabled
FROM pg_tables 
JOIN pg_class ON pg_tables.tablename = pg_class.relname
WHERE schemaname = 'public' 
  AND tablename IN ('employees', 'feedback_requests', 'feedback_responses');

-- List all policies for relevant tables
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('employees', 'feedback_requests', 'feedback_responses')
ORDER BY tablename, cmd; 