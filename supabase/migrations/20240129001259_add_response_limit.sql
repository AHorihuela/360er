-- Drop existing trigger
DROP TRIGGER IF EXISTS handle_feedback_response ON feedback_responses;
DROP FUNCTION IF EXISTS handle_feedback_response();

-- Create new trigger function with response limit check
CREATE OR REPLACE FUNCTION handle_feedback_response()
RETURNS TRIGGER
SECURITY DEFINER -- This makes the function run with owner privileges
SET search_path = public -- Security best practice when using SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_responses integer;
    v_target_responses integer;
    v_request_status text;
BEGIN
    -- Get request info
    SELECT 
        status,
        target_responses,
        (SELECT COUNT(*) FROM feedback_responses WHERE feedback_request_id = fr.id)
    INTO v_request_status, v_target_responses, v_current_responses
    FROM feedback_requests fr
    WHERE id = NEW.feedback_request_id;
    
    -- Check if we've hit the response limit
    IF v_current_responses >= COALESCE(v_target_responses, 999999) THEN
        RAISE EXCEPTION 'Maximum number of responses (%) reached for this feedback request', v_target_responses;
    END IF;
    
    -- Check if request is still pending
    IF v_request_status != 'pending' THEN
        RAISE EXCEPTION 'Feedback request is no longer accepting responses (status: %)', v_request_status;
    END IF;

    -- Set default values for text fields
    NEW.strengths := COALESCE(NEW.strengths, '');
    NEW.areas_for_improvement := COALESCE(NEW.areas_for_improvement, '');
    NEW.submitted_at := NOW();

    -- Update request status if this is the last expected response
    IF v_current_responses + 1 >= COALESCE(v_target_responses, 999999) THEN
        UPDATE feedback_requests fr
        SET status = 'submitted'
        WHERE id = NEW.feedback_request_id
        AND status = 'pending'
        AND unique_link IS NOT NULL;
    END IF;

    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER handle_feedback_response
    BEFORE INSERT ON feedback_responses
    FOR EACH ROW
    EXECUTE FUNCTION handle_feedback_response();

-- Test the fix
DO $$
DECLARE
    v_request_id uuid := '92fbee65-ff81-4d70-8c32-45a0c3ed7218';
    v_response_id uuid;
    v_request record;
BEGIN
    SET ROLE anon;
    
    -- Get current state
    SELECT 
        status,
        target_responses,
        (SELECT COUNT(*) FROM feedback_responses WHERE feedback_request_id = fr.id) as current_responses
    INTO v_request
    FROM feedback_requests fr
    WHERE id = v_request_id;
    
    RAISE NOTICE 'Current state: status=%, responses=%/%', 
        v_request.status, 
        v_request.current_responses, 
        v_request.target_responses;
    
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
    ) RETURNING id INTO v_response_id;
    
    RAISE NOTICE 'Successfully inserted response: %', v_response_id;
    
    RESET ROLE;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error: %', SQLERRM;
    RESET ROLE;
END $$;

-- Verify final state
SELECT 
    fr.id as request_id,
    fr.status as request_status,
    fr.target_responses,
    COUNT(fres.id) as current_responses,
    fr.unique_link IS NOT NULL as has_unique_link
FROM feedback_requests fr
LEFT JOIN feedback_responses fres ON fres.feedback_request_id = fr.id
WHERE fr.id = '92fbee65-ff81-4d70-8c32-45a0c3ed7218'
GROUP BY fr.id, fr.status, fr.target_responses, fr.unique_link; 