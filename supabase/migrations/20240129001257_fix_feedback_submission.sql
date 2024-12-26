-- First, ensure RLS is enabled on both tables
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to anon role
GRANT SELECT, UPDATE ON feedback_requests TO anon;
GRANT SELECT, INSERT ON feedback_responses TO anon;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "anon_view_feedback_requests" ON feedback_requests;
DROP POLICY IF EXISTS "anon_update_feedback_status" ON feedback_requests;
DROP POLICY IF EXISTS "anon_submit_feedback_responses" ON feedback_responses;
DROP POLICY IF EXISTS "anon_view_feedback_responses" ON feedback_responses;

-- Create policies for feedback requests
CREATE POLICY "anon_view_feedback_requests"
ON feedback_requests
FOR SELECT
TO anon
USING (unique_link IS NOT NULL);

CREATE POLICY "anon_update_feedback_status"
ON feedback_requests
FOR UPDATE
TO anon
USING (
    unique_link IS NOT NULL 
    AND status = 'pending'
)
WITH CHECK (status = 'submitted');

-- Create policies for feedback responses
CREATE POLICY "anon_submit_feedback_responses"
ON feedback_responses
FOR INSERT
TO anon
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM feedback_requests fr
        WHERE fr.id = feedback_request_id
        AND fr.unique_link IS NOT NULL
        AND fr.status = 'pending'
    )
);

CREATE POLICY "anon_view_feedback_responses"
ON feedback_responses
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 
        FROM feedback_requests fr
        WHERE fr.id = feedback_request_id
        AND fr.unique_link IS NOT NULL
    )
);

-- Test the policies
DO $$
DECLARE
    v_request_id uuid := '92fbee65-ff81-4d70-8c32-45a0c3ed7218';
    v_request record;
    v_response_id uuid;
BEGIN
    SET ROLE anon;
    RAISE NOTICE '=== Testing Anonymous Access ===';
    
    -- Test 1: View feedback request
    SELECT id, status, unique_link INTO v_request
    FROM feedback_requests
    WHERE id = v_request_id;
    
    RAISE NOTICE '1. View Request: OK (status: %)', v_request.status;
    
    -- Test 2: Submit feedback response
    INSERT INTO feedback_responses (
        feedback_request_id,
        relationship,
        strengths,
        areas_for_improvement
    ) VALUES (
        v_request_id,
        'equal_colleague',
        'Test strengths',
        'Test improvements'
    ) RETURNING id INTO v_response_id;
    
    RAISE NOTICE '2. Submit Response: OK (id: %)', v_response_id;
    
    -- Test 3: Update request status
    UPDATE feedback_requests 
    SET status = 'submitted'
    WHERE id = v_request_id
    AND status = 'pending'
    RETURNING status INTO v_request.status;
    
    RAISE NOTICE '3. Update Status: OK (new status: %)', v_request.status;
    
    RESET ROLE;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Test failed: %', SQLERRM;
    RESET ROLE;
END $$;

-- Verify final policies
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual::text as using_expr,
    with_check::text as with_check_expr
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('feedback_requests', 'feedback_responses')
AND roles @> ARRAY['anon']::name[]
ORDER BY tablename, policyname; 