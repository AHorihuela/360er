-- Drop all existing triggers and functions
DROP TRIGGER IF EXISTS update_feedback_request_status_trigger ON feedback_responses;
DROP TRIGGER IF EXISTS handle_feedback_response_insert ON feedback_responses;
DROP FUNCTION IF EXISTS update_feedback_request_status();
DROP FUNCTION IF EXISTS handle_feedback_response_insert();

-- Create a single, combined trigger function
CREATE OR REPLACE FUNCTION handle_feedback_response()
RETURNS TRIGGER AS $$
DECLARE
    target_count INTEGER;
    current_count INTEGER;
BEGIN
    -- Set the submitted_at timestamp
    NEW.submitted_at := NOW();

    -- Get the target number of responses
    SELECT COALESCE(target_responses, 3)
    INTO target_count
    FROM feedback_requests
    WHERE id = NEW.feedback_request_id;

    -- Get the current count of responses (including this new one)
    SELECT COUNT(*) + 1
    INTO current_count
    FROM feedback_responses
    WHERE feedback_request_id = NEW.feedback_request_id;

    -- Update the feedback request status
    UPDATE feedback_requests
    SET status = CASE 
        WHEN current_count >= target_count THEN 'completed'
        ELSE 'pending'
    END
    WHERE id = NEW.feedback_request_id;

    -- Log the operation for debugging
    RAISE NOTICE 'Inserting feedback response: request_id=%, target=%, current=%', 
        NEW.feedback_request_id, target_count, current_count;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a single trigger
CREATE TRIGGER handle_feedback_response
    BEFORE INSERT ON feedback_responses
    FOR EACH ROW
    EXECUTE FUNCTION handle_feedback_response();

-- Verify the trigger is the only one on the table
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM 
    information_schema.triggers
WHERE 
    event_object_table = 'feedback_responses'; 