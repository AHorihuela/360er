-- Test the complete feedback submission flow
DO $$
DECLARE
    v_request_id uuid := '92fbee65-ff81-4d70-8c32-45a0c3ed7218';
    v_request record;
    v_response_id uuid;
BEGIN
    SET ROLE anon;
    RAISE NOTICE '=== Testing Complete Feedback Flow ===';
    
    -- Step 1: View feedback request
    SELECT id, status, unique_link INTO v_request
    FROM feedback_requests
    WHERE id = v_request_id;
    
    RAISE NOTICE '1. View Request: OK (status: %, has link: %)', 
        v_request.status,
        CASE WHEN v_request.unique_link IS NOT NULL THEN 'yes' ELSE 'no' END;
    
    -- Step 2: Submit feedback response
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
    
    RAISE NOTICE '2. Submit Response: OK (id: %)', v_response_id;
    
    -- Step 3: Update request status
    UPDATE feedback_requests 
    SET status = 'submitted'
    WHERE id = v_request_id
    AND status = 'pending'
    RETURNING status INTO v_request.status;
    
    RAISE NOTICE '3. Update Status: OK (new status: %)', v_request.status;
    
    -- Step 4: Verify final state
    SELECT fr.status, COUNT(fres.id) as response_count
    INTO v_request
    FROM feedback_requests fr
    LEFT JOIN feedback_responses fres ON fres.feedback_request_id = fr.id
    WHERE fr.id = v_request_id
    GROUP BY fr.status;
    
    RAISE NOTICE '4. Final State: status=%, responses=%', 
        v_request.status, 
        v_request.response_count;
    
    RESET ROLE;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Flow failed at step %: %', 
        CASE 
            WHEN v_response_id IS NULL THEN '2'
            WHEN v_request.status = 'pending' THEN '3'
            ELSE '4'
        END,
        SQLERRM;
    RESET ROLE;
END $$; 