-- Create function to update feedback request status
CREATE OR REPLACE FUNCTION update_feedback_request_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the status of the feedback request
    UPDATE feedback_requests
    SET status = CASE 
        WHEN manually_completed THEN 'completed'
        WHEN (
            SELECT COUNT(*)
            FROM feedback_responses
            WHERE feedback_request_id = NEW.feedback_request_id
        ) >= target_responses THEN 'completed'
        ELSE 'pending'
    END
    WHERE id = NEW.feedback_request_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for feedback request status updates
DROP TRIGGER IF EXISTS update_feedback_request_status_trigger ON feedback_responses;
CREATE TRIGGER update_feedback_request_status_trigger
AFTER INSERT OR DELETE ON feedback_responses
FOR EACH ROW
EXECUTE FUNCTION update_feedback_request_status();

-- Create function to update review cycle status
CREATE OR REPLACE FUNCTION update_review_cycle_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the review cycle status based on all its feedback requests
    UPDATE review_cycles rc
    SET status = CASE 
        WHEN NOT EXISTS (
            SELECT 1 
            FROM feedback_requests fr 
            WHERE fr.review_cycle_id = rc.id 
            AND fr.status = 'pending'
        ) THEN 'completed'
        ELSE 'active'
    END
    WHERE id = (
        SELECT review_cycle_id 
        FROM feedback_requests 
        WHERE id = NEW.id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for review cycle status updates
DROP TRIGGER IF EXISTS update_review_cycle_status_trigger ON feedback_requests;
CREATE TRIGGER update_review_cycle_status_trigger
AFTER UPDATE OF status ON feedback_requests
FOR EACH ROW
EXECUTE FUNCTION update_review_cycle_status(); 