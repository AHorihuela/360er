-- Check current RLS policies
SELECT schemaname,
       tablename,
       policyname,
       permissive,
       roles,
       cmd,
       qual,
       with_check
FROM pg_policies
WHERE tablename IN ('feedback_responses', 'feedback_requests', 'employees', 'review_cycles', 'page_views');

-- Check table permissions
SELECT grantee,
       table_schema,
       table_name,
       privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
AND table_name IN ('feedback_responses', 'feedback_requests', 'employees', 'review_cycles', 'page_views');

-- Check specific feedback request
SELECT fr.id,
       fr.status,
       fr.unique_link,
       rc.review_by_date,
       COUNT(fres.id) as response_count
FROM feedback_requests fr
LEFT JOIN review_cycles rc ON rc.id = fr.review_cycle_id
LEFT JOIN feedback_responses fres ON fres.feedback_request_id = fr.id
WHERE fr.id = '92fbee65-ff81-4d70-8c32-45a0c3ed7218'
GROUP BY fr.id, fr.status, fr.unique_link, rc.review_by_date;

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('feedback_responses', 'feedback_requests', 'employees', 'review_cycles', 'page_views'); 