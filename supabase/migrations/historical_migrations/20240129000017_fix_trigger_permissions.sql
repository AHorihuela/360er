-- First, let's check and fix the trigger function
CREATE OR REPLACE FUNCTION handle_feedback_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- This is key - it will run with the privileges of the function owner
AS $$
BEGIN
    -- Your existing trigger logic here
    RETURN NEW;
END;
$$;

-- Drop and recreate the trigger with proper security
DROP TRIGGER IF EXISTS handle_feedback_response ON feedback_responses;
CREATE TRIGGER handle_feedback_response
    BEFORE INSERT ON feedback_responses
    FOR EACH ROW
    EXECUTE FUNCTION handle_feedback_response();

-- Same for the status update trigger
CREATE OR REPLACE FUNCTION update_feedback_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Your existing trigger logic here
    RETURN NEW;
END;
$$;

-- Drop and recreate the trigger with proper security
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