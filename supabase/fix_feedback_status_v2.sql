-- Drop existing trigger and function
DROP TRIGGER IF EXISTS handle_feedback_response ON feedback_responses;
DROP FUNCTION IF EXISTS handle_feedback_response();

-- Create new trigger function with more precise status handling
CREATE OR REPLACE FUNCTION handle_feedback_response()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update status if the request is manually completed
    UPDATE feedback_requests fr
    SET status = CASE 
        WHEN fr.manually_completed THEN 'completed'
        ELSE 'pending'
    END
    WHERE id = NEW.feedback_request_id;

    -- Set default values for text fields
    NEW.strengths := COALESCE(NEW.strengths, '');
    NEW.areas_for_improvement := COALESCE(NEW.areas_for_improvement, '');
    NEW.submitted_at := NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER handle_feedback_response
    BEFORE INSERT ON feedback_responses
    FOR EACH ROW
    EXECUTE FUNCTION handle_feedback_response();

-- Reset any incorrectly marked requests to pending unless manually completed
UPDATE feedback_requests fr
SET status = CASE 
    WHEN fr.manually_completed THEN 'completed'
    ELSE 'pending'
END; 