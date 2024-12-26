-- Drop existing policies and triggers first
DROP POLICY IF EXISTS "Allow anonymous feedback submission" ON public.feedback_responses;
DROP TRIGGER IF EXISTS check_feedback_response_limit ON public.feedback_responses;
DROP FUNCTION IF EXISTS check_feedback_response_limit();

-- Create new trigger function with session tracking
CREATE OR REPLACE FUNCTION check_feedback_response_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_count INTEGER;
    target_count INTEGER;
    request_status TEXT;
BEGIN
    -- Get the current count of responses and target count
    SELECT 
        COUNT(*), 
        fr.target_responses,
        fr.status
    INTO 
        current_count,
        target_count,
        request_status
    FROM feedback_requests fr
    LEFT JOIN feedback_responses fres ON fr.id = fres.feedback_request_id
    WHERE fr.id = NEW.feedback_request_id
    GROUP BY fr.id, fr.target_responses, fr.status;

    -- Check if the request is still open
    IF request_status = 'closed' THEN
        RAISE EXCEPTION 'This feedback request is closed';
    END IF;

    -- Check if we've reached the target (but allow it if we're exactly at target)
    IF current_count >= target_count THEN
        -- Update the request status to closed
        UPDATE feedback_requests 
        SET status = 'closed'
        WHERE id = NEW.feedback_request_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER check_feedback_response_limit
    BEFORE INSERT ON public.feedback_responses
    FOR EACH ROW
    EXECUTE FUNCTION check_feedback_response_limit();

-- Add unique constraint for feedback_request_id and session_id
ALTER TABLE public.feedback_responses
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD CONSTRAINT unique_feedback_per_session UNIQUE (feedback_request_id, session_id);

-- Create new RLS policy for feedback submissions
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

-- Grant necessary permissions
GRANT SELECT ON public.feedback_requests TO public;
GRANT SELECT ON public.review_cycles TO public;
GRANT INSERT ON public.feedback_responses TO public; 