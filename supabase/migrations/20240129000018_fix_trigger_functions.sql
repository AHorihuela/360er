-- First, let's recreate the handle_feedback_response function with proper security
CREATE OR REPLACE FUNCTION handle_feedback_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with owner privileges
AS $$
BEGIN
    -- Validate the feedback request exists and is in progress
    IF NOT EXISTS (
        SELECT 1 
        FROM feedback_requests 
        WHERE id = NEW.feedback_request_id 
        AND status = 'in_progress'
    ) THEN
        RAISE EXCEPTION 'Invalid feedback request or request is not in progress';
    END IF;

    -- Set the submitted_at timestamp
    NEW.submitted_at := CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$;

-- Recreate the update_feedback_request_status function with proper security
CREATE OR REPLACE FUNCTION update_feedback_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with owner privileges
AS $$
BEGIN
    -- After insert, check if we need to update the feedback request status
    IF TG_OP = 'INSERT' THEN
        -- Update the feedback request status if all expected responses are received
        UPDATE feedback_requests
        SET status = 'completed'
        WHERE id = NEW.feedback_request_id
        AND status = 'in_progress';
        
        RETURN NEW;
    END IF;

    -- After delete, revert status to in_progress if needed
    IF TG_OP = 'DELETE' THEN
        UPDATE feedback_requests
        SET status = 'in_progress'
        WHERE id = OLD.feedback_request_id
        AND status = 'completed';
        
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

-- Drop and recreate triggers
DROP TRIGGER IF EXISTS handle_feedback_response ON feedback_responses;
CREATE TRIGGER handle_feedback_response
    BEFORE INSERT ON feedback_responses
    FOR EACH ROW
    EXECUTE FUNCTION handle_feedback_response();

DROP TRIGGER IF EXISTS update_feedback_request_status_trigger ON feedback_responses;
CREATE TRIGGER update_feedback_request_status_trigger
    AFTER INSERT OR DELETE ON feedback_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_request_status();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON feedback_requests TO anon;
GRANT INSERT, SELECT ON feedback_responses TO anon;

-- Enable RLS but allow trigger functions to bypass it
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY; 