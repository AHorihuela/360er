-- Check the feedback request state
SELECT 
    id,
    status,
    unique_link IS NOT NULL as has_unique_link,
    unique_link,
    created_at,
    updated_at
FROM feedback_requests 
WHERE id = '92fbee65-ff81-4d70-8c32-45a0c3ed7218';

-- Check existing responses
SELECT 
    id,
    relationship,
    submitted_at,
    feedback_request_id
FROM feedback_responses
WHERE feedback_request_id = '92fbee65-ff81-4d70-8c32-45a0c3ed7218';

-- Test as anon role
DO $$
DECLARE
    v_request_id uuid := '92fbee65-ff81-4d70-8c32-45a0c3ed7218';
    v_request record;
BEGIN
    SET ROLE anon;
    
    -- Try to view the request
    SELECT id, status, unique_link INTO v_request
    FROM feedback_requests
    WHERE id = v_request_id;
    
    IF v_request.unique_link IS NOT NULL THEN
        RAISE NOTICE 'Request is accessible (status: %)', v_request.status;
    ELSE
        RAISE WARNING 'Request is not accessible';
    END IF;
    
    RESET ROLE;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error: %', SQLERRM;
    RESET ROLE;
END $$;

-- Check RLS is enabled
SELECT 
    tablename,
    relrowsecurity as rls_enabled
FROM pg_tables t
JOIN pg_class c ON t.tablename = c.relname
WHERE tablename IN ('feedback_requests', 'feedback_responses')
AND schemaname = 'public'; 