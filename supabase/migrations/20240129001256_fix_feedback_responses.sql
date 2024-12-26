-- Drop existing anon policies for feedback_responses
DROP POLICY IF EXISTS "anon_submit_feedback_responses" ON feedback_responses;
DROP POLICY IF EXISTS "anon_view_feedback_responses" ON feedback_responses;
DROP POLICY IF EXISTS "Anyone can submit feedback responses" ON feedback_responses;

-- Create policy for submitting feedback
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

-- Create policy for viewing submitted feedback
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
    
    RAISE NOTICE 'Insert test: Success - Created response %', v_response_id;
    
    -- Try to view the response
    IF EXISTS (
        SELECT 1 
        FROM feedback_responses 
        WHERE id = v_response_id
    ) THEN
        RAISE NOTICE 'Select test: Success - Can view response';
    END IF;
    
    RESET ROLE;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Test failed: %', SQLERRM;
    RESET ROLE;
END $$;

-- Verify final state
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