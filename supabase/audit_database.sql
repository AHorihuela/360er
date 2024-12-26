-- Output current database state
SELECT tablename, array_agg(column_name::text || ' ' || data_type::text) as columns
FROM pg_tables 
JOIN information_schema.columns ON tablename = table_name
WHERE schemaname = 'public'
GROUP BY tablename;

-- Check RLS status
SELECT tablename, relrowsecurity 
FROM pg_tables 
JOIN pg_class ON tablename = relname
WHERE schemaname = 'public';

-- Check permissions
SELECT grantee, table_name, string_agg(privilege_type, ', ') as privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND grantee = 'anon'
GROUP BY grantee, table_name;

-- Check policies
SELECT schemaname, 
       tablename, 
       policyname, 
       permissive, 
       roles::text, 
       cmd, 
       qual::text, 
       with_check::text
FROM pg_policies
WHERE schemaname = 'public';

-- Test specific feedback request access
SET ROLE anon;
SELECT EXISTS (
    SELECT 1 
    FROM feedback_requests 
    WHERE id = '92fbee65-ff81-4d70-8c32-45a0c3ed7218'
) as can_access_feedback_request;

-- Test feedback response submission permission
SELECT EXISTS (
    SELECT 1 
    FROM feedback_requests fr
    WHERE fr.id = '92fbee65-ff81-4d70-8c32-45a0c3ed7218'
    AND fr.status = 'pending'
    AND fr.unique_link IS NOT NULL
) as can_submit_feedback;

RESET ROLE; 