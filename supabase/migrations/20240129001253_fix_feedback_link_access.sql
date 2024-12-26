-- First, backup existing policies
DO $$
BEGIN
    RAISE NOTICE 'Backing up existing policies...';
    CREATE TABLE IF NOT EXISTS policy_backup_20240129 AS
    SELECT * FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'feedback_requests';
END $$;

-- Drop existing policies but keep a record
SELECT policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'feedback_requests';

-- Create new policies for feedback requests
CREATE POLICY "anon_view_feedback_requests"
ON feedback_requests
FOR SELECT
TO anon
USING (
    unique_link IS NOT NULL
);

CREATE POLICY "anon_update_feedback_status"
ON feedback_requests
FOR UPDATE
TO anon
USING (
    unique_link IS NOT NULL 
    AND status = 'pending'
)
WITH CHECK (
    status = 'submitted'
);

-- Test the fix
DO $$
DECLARE
    v_request_id uuid := '92fbee65-ff81-4d70-8c32-45a0c3ed7218';
    v_can_view boolean;
    v_can_update boolean;
BEGIN
    SET ROLE anon;
    
    -- Test viewing
    SELECT EXISTS (
        SELECT 1 
        FROM feedback_requests 
        WHERE id = v_request_id
    ) INTO v_can_view;
    
    IF NOT v_can_view THEN
        RAISE WARNING 'Cannot view feedback request';
    ELSE
        RAISE NOTICE 'Can view feedback request';
    END IF;
    
    -- Test updating
    BEGIN
        UPDATE feedback_requests 
        SET status = 'submitted'
        WHERE id = v_request_id
        AND status = 'pending'
        RETURNING true INTO v_can_update;
        
        IF v_can_update THEN
            RAISE NOTICE 'Can update feedback request status';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Cannot update feedback request status: %', SQLERRM;
    END;
    
    RESET ROLE;
END $$;

-- Verify policies
SELECT 
    policyname,
    cmd,
    roles::text,
    qual::text as using_expr,
    with_check::text as with_check_expr
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'feedback_requests'
ORDER BY policyname; 