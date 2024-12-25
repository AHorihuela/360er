-- First, force the correct status for all feedback requests
UPDATE feedback_requests fr
SET status = CASE 
    WHEN (
        SELECT COUNT(*) 
        FROM feedback_responses fres 
        WHERE fres.feedback_request_id = fr.id
    ) >= COALESCE(fr.target_responses, 3) THEN 'completed'
    ELSE 'pending'
END;

-- Drop and recreate the trigger function with simpler logic
DROP TRIGGER IF EXISTS handle_feedback_response ON feedback_responses;
DROP FUNCTION IF EXISTS handle_feedback_response();

CREATE OR REPLACE FUNCTION handle_feedback_response()
RETURNS TRIGGER AS $$
BEGIN
    -- Set default values
    NEW.submitted_at := NOW();
    NEW.strengths := COALESCE(NEW.strengths, '');
    NEW.areas_for_improvement := COALESCE(NEW.areas_for_improvement, '');

    -- Update the feedback request status based on actual count
    WITH response_count AS (
        SELECT COUNT(*) + 1 as total
        FROM feedback_responses
        WHERE feedback_request_id = NEW.feedback_request_id
    )
    UPDATE feedback_requests fr
    SET status = CASE 
        WHEN response_count.total >= COALESCE(fr.target_responses, 3) THEN 'completed'
        ELSE 'pending'
    END
    FROM response_count
    WHERE fr.id = NEW.feedback_request_id;

    -- Log for debugging
    RAISE NOTICE 'Feedback response trigger executed for request_id: %', NEW.feedback_request_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER handle_feedback_response
    BEFORE INSERT ON feedback_responses
    FOR EACH ROW
    EXECUTE FUNCTION handle_feedback_response();

-- Verify the fix
SELECT 
    fr.id,
    fr.status as current_status,
    fr.target_responses,
    COUNT(fres.id) as response_count,
    CASE 
        WHEN COUNT(fres.id) >= COALESCE(fr.target_responses, 3) THEN 'completed'
        ELSE 'pending'
    END as expected_status,
    array_agg(fres.submitted_at ORDER BY fres.submitted_at) as submission_dates
FROM 
    feedback_requests fr
    LEFT JOIN feedback_responses fres ON fr.id = fres.feedback_request_id
WHERE 
    fr.id = '92fbee65-ff81-4d70-8c32-45a0c3ed7218'
GROUP BY 
    fr.id,
    fr.status,
    fr.target_responses; 