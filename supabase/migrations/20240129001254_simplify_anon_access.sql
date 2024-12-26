-- First drop all anon policies
DROP POLICY IF EXISTS "anon_feedback_request_access" ON feedback_requests;
DROP POLICY IF EXISTS "anon_view_feedback_requests" ON feedback_requests;
DROP POLICY IF EXISTS "anon_update_feedback_requests" ON feedback_requests;
DROP POLICY IF EXISTS "Anyone can view feedback requests by unique link" ON feedback_requests;
DROP POLICY IF EXISTS "anon_access_feedback_requests" ON feedback_requests;

-- Create separate policies for SELECT and UPDATE
CREATE POLICY "anon_view_feedback_requests"
ON feedback_requests
FOR SELECT
TO anon
USING (unique_link IS NOT NULL);

CREATE POLICY "anon_update_feedback_requests"
ON feedback_requests
FOR UPDATE
TO anon
USING (
    unique_link IS NOT NULL 
    AND status = 'pending'
)
WITH CHECK (status = 'submitted');

-- Test the fix
DO $$
DECLARE
    v_request_id uuid := '92fbee65-ff81-4d70-8c32-45a0c3ed7218';
    v_request record;
BEGIN
    -- Test as anon role
    SET ROLE anon;
    
    -- Test SELECT
    BEGIN
        SELECT id, status, unique_link INTO STRICT v_request
        FROM feedback_requests
        WHERE id = v_request_id;
        
        RAISE NOTICE 'SELECT test: Success - Found request with status %', v_request.status;
    EXCEPTION 
        WHEN NO_DATA_FOUND THEN
            RAISE WARNING 'SELECT test: Failed - Request not found';
        WHEN OTHERS THEN
            RAISE WARNING 'SELECT test: Failed - %', SQLERRM;
    END;
    
    -- Test UPDATE
    BEGIN
        UPDATE feedback_requests 
        SET status = 'submitted'
        WHERE id = v_request_id
        AND status = 'pending'
        RETURNING status INTO v_request.status;
        
        RAISE NOTICE 'UPDATE test: Success - Updated status to %', v_request.status;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'UPDATE test: Failed - %', SQLERRM;
    END;
    
    RESET ROLE;
END $$;

-- Verify final policies
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