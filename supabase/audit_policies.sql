-- List all policies for employees table with full details
SELECT 
    policyname,
    permissive,
    cmd,
    qual,
    with_check,
    roles
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename = 'employees'
ORDER BY cmd, policyname;

-- Group policies by operation to find duplicates
SELECT 
    tablename,
    cmd,
    COUNT(*) as policy_count,
    array_agg(policyname) as policy_names
FROM pg_policies
WHERE schemaname = 'public' 
    AND tablename IN ('employees', 'feedback_requests', 'feedback_responses')
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY tablename, cmd; 