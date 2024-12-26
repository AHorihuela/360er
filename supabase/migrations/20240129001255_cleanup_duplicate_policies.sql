-- Drop duplicate update policies
DROP POLICY IF EXISTS "anon_update_feedback_status" ON feedback_requests;
DROP POLICY IF EXISTS "anon_update_feedback_requests" ON feedback_requests;

-- Create single update policy
CREATE POLICY "anon_update_feedback_status"
ON feedback_requests
FOR UPDATE
TO anon
USING (
    unique_link IS NOT NULL 
    AND status = 'pending'
)
WITH CHECK (status = 'submitted');

-- Verify final state
SELECT 
    policyname,
    cmd,
    roles::text,
    qual::text as using_expr,
    with_check::text as with_check_expr
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'feedback_requests'
AND roles @> ARRAY['anon']::name[]
ORDER BY policyname;

-- Test the policies
DO $$
DECLARE
    v_request_id uuid := '92fbee65-ff81-4d70-8c32-45a0c3ed7218';
    v_request record;
BEGIN
    SET ROLE anon;
    
    -- Test view access
    SELECT id, status, unique_link INTO v_request
    FROM feedback_requests
    WHERE id = v_request_id;
    
    RAISE NOTICE 'View access: OK - Found request with status %', v_request.status;
    
    -- Test update access
    UPDATE feedback_requests 
    SET status = 'submitted'
    WHERE id = v_request_id
    AND status = 'pending'
    RETURNING status INTO v_request.status;
    
    RAISE NOTICE 'Update access: OK - Updated to status %', v_request.status;
    
    RESET ROLE;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Test failed: %', SQLERRM;
    RESET ROLE;
END $$; 