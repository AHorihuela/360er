-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS handle_feedback_response ON feedback_responses;
DROP TRIGGER IF EXISTS handle_feedback_response_insert ON feedback_responses;
DROP TRIGGER IF EXISTS update_feedback_request_status_trigger ON feedback_responses;
DROP FUNCTION IF EXISTS handle_feedback_response();
DROP FUNCTION IF EXISTS handle_feedback_response_insert();
DROP FUNCTION IF EXISTS update_feedback_request_status();

-- Create a robust trigger function
CREATE OR REPLACE FUNCTION handle_feedback_response()
RETURNS TRIGGER AS $$
DECLARE
    target_count INTEGER;
    current_count INTEGER;
    request_exists BOOLEAN;
BEGIN
    -- Check if feedback_request exists and is pending
    SELECT EXISTS (
        SELECT 1 FROM feedback_requests 
        WHERE id = NEW.feedback_request_id 
        AND status = 'pending'
    ) INTO request_exists;

    IF NOT request_exists THEN
        RAISE EXCEPTION 'Invalid or non-pending feedback request: %', NEW.feedback_request_id;
    END IF;

    -- Validate required fields
    IF NEW.relationship IS NULL THEN
        RAISE EXCEPTION 'relationship cannot be null';
    END IF;

    IF NEW.strengths IS NULL THEN
        NEW.strengths := '';
    END IF;

    IF NEW.areas_for_improvement IS NULL THEN
        NEW.areas_for_improvement := '';
    END IF;

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
    RAISE NOTICE 'Feedback response processed: request_id=%, target=%, current=%, relationship=%', 
        NEW.feedback_request_id, target_count, current_count, NEW.relationship;

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

-- Verify the trigger is installed
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

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'feedback_responses_feedback_request_id_fkey'
  ) THEN
    ALTER TABLE feedback_responses
    ADD CONSTRAINT feedback_responses_feedback_request_id_fkey
    FOREIGN KEY (feedback_request_id) 
    REFERENCES feedback_requests(id)
    ON DELETE CASCADE;
  END IF;
END $$; 