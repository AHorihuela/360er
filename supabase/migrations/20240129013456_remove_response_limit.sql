-- Drop existing triggers and functions that enforce limits
DROP TRIGGER IF EXISTS check_feedback_response_limit ON public.feedback_responses;
DROP FUNCTION IF EXISTS check_feedback_response_limit();
DROP TRIGGER IF EXISTS handle_feedback_response ON public.feedback_responses;
DROP FUNCTION IF EXISTS handle_feedback_response();

-- Create new trigger function that only handles basic validation and session tracking
CREATE OR REPLACE FUNCTION handle_feedback_response()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_request_status text;
    v_unique_link text;
BEGIN
    -- Get request info
    SELECT 
        status,
        unique_link
    INTO v_request_status, v_unique_link
    FROM feedback_requests fr
    WHERE id = NEW.feedback_request_id;
    
    -- Check if request exists and has unique link
    IF v_unique_link IS NULL THEN
        RAISE EXCEPTION 'Invalid feedback request';
    END IF;
    
    -- Check if request is still pending (not closed)
    IF v_request_status = 'closed' THEN
        RAISE EXCEPTION 'Feedback request is closed and no longer accepting responses';
    END IF;
    
    -- Set default values for text fields
    NEW.strengths := COALESCE(NEW.strengths, '');
    NEW.areas_for_improvement := COALESCE(NEW.areas_for_improvement, '');
    NEW.submitted_at := NOW();

    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER handle_feedback_response
    BEFORE INSERT ON feedback_responses
    FOR EACH ROW
    EXECUTE FUNCTION handle_feedback_response();

-- Update RLS policy to remove target response check
DROP POLICY IF EXISTS "Allow anonymous feedback submission" ON public.feedback_responses;

CREATE POLICY "Allow anonymous feedback submission"
ON public.feedback_responses
FOR INSERT
TO public
WITH CHECK (
    EXISTS (
        SELECT 1 FROM feedback_requests fr
        WHERE fr.id = feedback_request_id
        AND fr.unique_link IS NOT NULL
        AND fr.status != 'closed'
        AND EXISTS (
            SELECT 1 FROM review_cycles rc
            WHERE rc.id = fr.review_cycle_id
            AND rc.review_by_date >= CURRENT_DATE
        )
    )
);

-- Keep the session uniqueness constraint
ALTER TABLE feedback_responses 
DROP CONSTRAINT IF EXISTS unique_session_response,
DROP CONSTRAINT IF EXISTS unique_feedback_per_session;

ALTER TABLE feedback_responses
ADD CONSTRAINT unique_feedback_per_session 
UNIQUE (feedback_request_id, session_id); 