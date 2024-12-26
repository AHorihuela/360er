-- Check feedback_responses policies
SELECT 
    policyname,
    cmd,
    roles::text,
    qual::text as using_expr,
    with_check::text as with_check_expr
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'feedback_responses'
AND roles @> ARRAY['anon']::name[]
ORDER BY policyname;

-- Check permissions
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name = 'feedback_responses'
AND grantee = 'anon';

-- Test feedback response submission
DO $$
DECLARE
    v_request_id uuid := '92fbee65-ff81-4d70-8c32-45a0c3ed7218';
    v_response_id uuid;
BEGIN
    SET ROLE anon;
    
    -- Try to insert a response
    INSERT INTO feedback_responses (
        feedback_request_id,
        relationship,
        strengths,
        areas_for_improvement
    ) VALUES (
        v_request_id,
        'peer',
        'Test strengths',
        'Test improvements'
    ) RETURNING id INTO v_response_id;
    
    RAISE NOTICE 'Successfully inserted response with ID: %', v_response_id;
    
    RESET ROLE;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to insert response: %', SQLERRM;
    RESET ROLE;
END $$; 