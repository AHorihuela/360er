-- Check table permissions for anon role
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name IN ('feedback_requests', 'feedback_responses')
AND grantee = 'anon'
ORDER BY table_name, privilege_type;

-- Check if anon role exists and is active
SELECT 
    r.rolname,
    r.rolcanlogin,
    r.rolsuper,
    r.rolinherit,
    r.rolcreaterole,
    r.rolcreatedb,
    r.rolbypassrls,
    r.rolreplication,
    r.rolconnlimit,
    r.rolvaliduntil
FROM pg_roles r
WHERE r.rolname = 'anon';

-- Test transaction as anon
DO $$
BEGIN
    SET ROLE anon;
    
    -- Try a simple select
    PERFORM 1 
    FROM feedback_requests 
    WHERE unique_link IS NOT NULL 
    LIMIT 1;
    
    RAISE NOTICE 'Anon role can query feedback_requests';
    
    -- Try a simple insert
    BEGIN
        WITH test_insert AS (
            INSERT INTO feedback_responses (
                feedback_request_id,
                relationship,
                strengths,
                areas_for_improvement
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                'equal_colleague',
                'test',
                'test'
            )
            RETURNING id
        ) SELECT 1;
        
        RAISE NOTICE 'Anon role can insert into feedback_responses (policy will prevent invalid data)';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%policy%' THEN
            RAISE NOTICE 'Anon role can attempt insert (blocked by policy as expected)';
        ELSE
            RAISE WARNING 'Unexpected error on insert: %', SQLERRM;
        END IF;
    END;
    
    RESET ROLE;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error: %', SQLERRM;
    RESET ROLE;
END $$; 