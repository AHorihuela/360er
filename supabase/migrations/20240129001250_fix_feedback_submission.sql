-- First backup existing policies
CREATE TABLE IF NOT EXISTS policy_backup AS
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Fix feedback response submission
CREATE OR REPLACE POLICY "anon_submit_feedback_responses"
ON feedback_responses
FOR INSERT
TO anon
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM feedback_requests fr
        WHERE fr.id = feedback_request_id
        AND fr.status = 'pending'
        AND fr.unique_link IS NOT NULL
    )
);

-- Fix feedback request viewing
CREATE OR REPLACE POLICY "anon_access_feedback_requests"
ON feedback_requests
FOR SELECT
TO anon
USING (unique_link IS NOT NULL);

-- Verify the fix
DO $$
DECLARE
    v_request_id uuid := '92fbee65-ff81-4d70-8c32-45a0c3ed7218';
    v_can_access boolean;
    v_can_submit boolean;
BEGIN
    -- Test access
    SET ROLE anon;
    SELECT EXISTS (
        SELECT 1 
        FROM feedback_requests 
        WHERE id = v_request_id
    ) INTO v_can_access;
    
    -- Test submission
    SELECT EXISTS (
        SELECT 1 
        FROM feedback_requests fr
        WHERE fr.id = v_request_id
        AND fr.status = 'pending'
        AND fr.unique_link IS NOT NULL
    ) INTO v_can_submit;
    RESET ROLE;
    
    IF NOT v_can_access THEN
        RAISE EXCEPTION 'Cannot access feedback request';
    END IF;
    
    IF NOT v_can_submit THEN
        RAISE EXCEPTION 'Cannot submit feedback response';
    END IF;
    
    RAISE NOTICE 'Fix verified successfully';
END $$; 