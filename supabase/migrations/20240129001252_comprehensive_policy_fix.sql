-- First, drop all anon policies for feedback_requests to start clean
DROP POLICY IF EXISTS "anon_access_feedback_requests" ON feedback_requests;
DROP POLICY IF EXISTS "anon_update_feedback_request_status" ON feedback_requests;
DROP POLICY IF EXISTS "temp_anon_access_feedback_requests" ON feedback_requests;
DROP POLICY IF EXISTS "temp_anon_update_feedback_request_status" ON feedback_requests;
DROP POLICY IF EXISTS "Anyone can view feedback requests by unique link" ON feedback_requests;

-- Ensure RLS is enabled
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, UPDATE ON feedback_requests TO anon;

-- Create single comprehensive policy for anonymous access
CREATE POLICY "anon_feedback_request_access"
ON feedback_requests
AS PERMISSIVE
TO anon
USING (
    unique_link IS NOT NULL 
    AND (
        -- For SELECT operations, allow viewing pending requests
        (current_setting('request.operation', true) = 'SELECT' AND status = 'pending')
        OR
        -- For UPDATE operations, allow updating from pending to submitted
        (current_setting('request.operation', true) = 'UPDATE' AND status = 'pending')
    )
)
WITH CHECK (
    unique_link IS NOT NULL 
    AND status = 'submitted'
);

-- Test the fix
DO $$
DECLARE
    v_request_id uuid := '92fbee65-ff81-4d70-8c32-45a0c3ed7218';
    v_can_select boolean;
    v_can_update boolean;
BEGIN
    -- Test SELECT access
    SET ROLE anon;
    SET request.operation TO 'SELECT';
    
    SELECT EXISTS (
        SELECT 1 
        FROM feedback_requests
        WHERE id = v_request_id
    ) INTO v_can_select;
    
    IF NOT v_can_select THEN
        RAISE WARNING 'Cannot select feedback request';
    ELSE
        RAISE NOTICE 'Select permission verified';
    END IF;
    
    -- Test UPDATE access
    SET request.operation TO 'UPDATE';
    
    SELECT EXISTS (
        SELECT 1 
        FROM feedback_requests
        WHERE id = v_request_id
        AND status = 'pending'
        FOR UPDATE
    ) INTO v_can_update;
    
    IF NOT v_can_update THEN
        RAISE WARNING 'Cannot update feedback request status';
    ELSE
        RAISE NOTICE 'Update permission verified';
    END IF;
    
    RESET ROLE;
END $$; 