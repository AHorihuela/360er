-- First check as superuser
SELECT 
    id,
    status,
    unique_link,
    review_cycle_id,
    employee_id,
    created_at,
    updated_at
FROM feedback_requests 
WHERE id = '92fbee65-ff81-4d70-8c32-45a0c3ed7218';

-- Then check as anon
DO $$
DECLARE
    v_request_id uuid := '92fbee65-ff81-4d70-8c32-45a0c3ed7218';
    v_request record;
BEGIN
    SET ROLE anon;
    
    -- Try to view the request
    SELECT 
        id, 
        status, 
        unique_link,
        review_cycle_id,
        employee_id
    INTO STRICT v_request
    FROM feedback_requests
    WHERE id = v_request_id;
    
    RAISE NOTICE 'Request details: id=%, status=%, has_link=%', 
        v_request.id, 
        v_request.status,
        v_request.unique_link IS NOT NULL;
        
    -- Try to insert a response
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
    );
    
    RAISE NOTICE 'Successfully inserted response';
    
    RESET ROLE;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error: %', SQLERRM;
    RESET ROLE;
END $$;

-- Check if the request has a valid review cycle
SELECT 
    fr.id as request_id,
    fr.status as request_status,
    fr.unique_link IS NOT NULL as has_unique_link,
    rc.id as cycle_id,
    rc.status as cycle_status,
    rc.review_by_date,
    rc.review_by_date > NOW() as cycle_active
FROM feedback_requests fr
LEFT JOIN review_cycles rc ON fr.review_cycle_id = rc.id
WHERE fr.id = '92fbee65-ff81-4d70-8c32-45a0c3ed7218'; 