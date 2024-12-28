-- Drop existing policy first
DROP POLICY IF EXISTS "anon_update_feedback_request_status" ON feedback_requests;

-- Grant necessary permissions
GRANT UPDATE (status) ON feedback_requests TO anon;

-- Create policy for updating status
CREATE POLICY "anon_update_feedback_request_status"
ON feedback_requests
FOR UPDATE
TO anon
USING (
    unique_link IS NOT NULL 
    AND status = 'pending'
)
WITH CHECK (
    unique_link IS NOT NULL 
    AND status = 'submitted'
);

-- Test the fix
DO $$
DECLARE
    v_request_id uuid := '92fbee65-ff81-4d70-8c32-45a0c3ed7218';
    v_can_update boolean;
BEGIN
    SET ROLE anon;
    
    -- Test if we can update the status
    SELECT EXISTS (
        SELECT 1 
        FROM feedback_requests
        WHERE id = v_request_id
        AND unique_link IS NOT NULL
        AND status = 'pending'
        FOR UPDATE
    ) INTO v_can_update;
    
    IF NOT v_can_update THEN
        RAISE WARNING 'Cannot update feedback request status';
    ELSE
        RAISE NOTICE 'Status update permission verified';
    END IF;
    
    RESET ROLE;
END $$; 