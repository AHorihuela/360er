-- First, fix the status of the feedback request
UPDATE feedback_requests
SET status = 'pending'
WHERE id = '92fbee65-ff81-4d70-8c32-45a0c3ed7218'
AND target_responses > (
    SELECT COUNT(*) 
    FROM feedback_responses 
    WHERE feedback_request_id = '92fbee65-ff81-4d70-8c32-45a0c3ed7218'
);

-- Drop and recreate the trigger function with better status handling
DROP TRIGGER IF EXISTS handle_feedback_response ON feedback_responses;
DROP FUNCTION IF EXISTS handle_feedback_response();

CREATE OR REPLACE FUNCTION handle_feedback_response()
RETURNS TRIGGER AS $$
DECLARE
    target_count INTEGER;
    current_count INTEGER;
    request_exists BOOLEAN;
BEGIN
    -- Check if feedback_request exists
    SELECT EXISTS (
        SELECT 1 FROM feedback_requests 
        WHERE id = NEW.feedback_request_id
    ) INTO request_exists;

    IF NOT request_exists THEN
        RAISE EXCEPTION 'Invalid feedback request: %', NEW.feedback_request_id;
    END IF;

    -- Get the target number of responses
    SELECT target_responses
    INTO target_count
    FROM feedback_requests
    WHERE id = NEW.feedback_request_id;

    -- If target_responses is null, set a default of 3
    IF target_count IS NULL THEN
        target_count := 3;
        
        -- Update the feedback request with the default target
        UPDATE feedback_requests
        SET target_responses = 3
        WHERE id = NEW.feedback_request_id;
    END IF;

    -- Get the current count of responses (including this new one)
    SELECT COUNT(*) + 1
    INTO current_count
    FROM feedback_responses
    WHERE feedback_request_id = NEW.feedback_request_id;

    -- Set default values for nullable fields
    NEW.submitted_at := NOW();
    NEW.strengths := COALESCE(NEW.strengths, '');
    NEW.areas_for_improvement := COALESCE(NEW.areas_for_improvement, '');

    -- Update the feedback request status
    UPDATE feedback_requests
    SET 
        status = CASE 
            WHEN current_count >= target_count THEN 'completed'
            ELSE 'pending'
        END
    WHERE id = NEW.feedback_request_id;

    -- Log the operation for debugging
    RAISE NOTICE 'Processing feedback response: request_id=%, target=%, current=%, will_complete=%', 
        NEW.feedback_request_id, 
        target_count, 
        current_count,
        current_count >= target_count;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log any errors
    RAISE NOTICE 'Error in handle_feedback_response: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER handle_feedback_response
    BEFORE INSERT ON feedback_responses
    FOR EACH ROW
    EXECUTE FUNCTION handle_feedback_response();

-- Verify the current status
SELECT 
    fr.id,
    fr.status,
    fr.target_responses,
    COUNT(fres.id) as current_responses,
    CASE 
        WHEN COUNT(fres.id) >= COALESCE(fr.target_responses, 3) THEN 'should_be_completed'
        ELSE 'should_be_pending'
    END as expected_status
FROM 
    feedback_requests fr
    LEFT JOIN feedback_responses fres ON fr.id = fres.feedback_request_id
WHERE 
    fr.id = '92fbee65-ff81-4d70-8c32-45a0c3ed7218'
GROUP BY 
    fr.id,
    fr.status,
    fr.target_responses; 