-- Drop existing trigger
DROP TRIGGER IF EXISTS handle_feedback_response ON feedback_responses;
DROP FUNCTION IF EXISTS handle_feedback_response();

-- Create new trigger function with security definer
CREATE OR REPLACE FUNCTION handle_feedback_response()
RETURNS TRIGGER
SECURITY DEFINER -- This makes the function run with owner privileges
SET search_path = public -- Security best practice when using SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Set default values for text fields first
    NEW.strengths := COALESCE(NEW.strengths, '');
    NEW.areas_for_improvement := COALESCE(NEW.areas_for_improvement, '');
    NEW.submitted_at := NOW();

    -- Only update the request status if it exists and is pending
    UPDATE feedback_requests fr
    SET status = 'submitted'
    WHERE id = NEW.feedback_request_id
    AND status = 'pending'
    AND unique_link IS NOT NULL;

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
        'equal_colleague',
        'Test strengths',
        'Test improvements'
    ) RETURNING id INTO v_response_id;
    
    RAISE NOTICE 'Successfully inserted response: %', v_response_id;
    
    -- Verify the request status
    SELECT status 
    FROM feedback_requests 
    WHERE id = v_request_id 
    INTO STRICT v_request_id;
    
    RAISE NOTICE 'Request status after insert: %', v_request_id;
    
    RESET ROLE;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error: %', SQLERRM;
    RESET ROLE;
END $$;

-- Verify final state
SELECT 
    fr.id as request_id,
    fr.status as request_status,
    fr.unique_link IS NOT NULL as has_unique_link,
    COUNT(fres.id) as response_count
FROM feedback_requests fr
LEFT JOIN feedback_responses fres ON fres.feedback_request_id = fr.id
WHERE fr.id = '92fbee65-ff81-4d70-8c32-45a0c3ed7218'
GROUP BY fr.id, fr.status, fr.unique_link; 