-- Migration: Handle feedback_response trigger for Manager-to-Employee feedback
-- Purpose: Allow M2E feedback submission without unique_link requirement
--
-- M2E feedback uses direct manager submission (no anonymous links needed)

-- Update the handle_feedback_response function to handle M2E cycles
CREATE OR REPLACE FUNCTION handle_feedback_response()
RETURNS TRIGGER
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request_status text;
    v_unique_link text;
    v_cycle_type text;
BEGIN
    -- Get request info including cycle type
    SELECT 
        fr.status,
        fr.unique_link,
        rc.type
    INTO v_request_status, v_unique_link, v_cycle_type
    FROM feedback_requests fr
    JOIN review_cycles rc ON fr.review_cycle_id = rc.id
    WHERE fr.id = NEW.feedback_request_id;
    
    -- Check if request exists
    IF v_request_status IS NULL THEN
        RAISE EXCEPTION 'Feedback request not found';
    END IF;
    
    -- For non-M2E cycles, require unique_link (anonymous feedback)
    -- For M2E cycles, allow NULL unique_link (direct manager feedback)
    IF v_cycle_type != 'manager_to_employee' AND v_unique_link IS NULL THEN
        RAISE EXCEPTION 'Invalid feedback request - anonymous link required';
    END IF;
    
    -- Check if request is still accepting responses
    IF v_request_status = 'closed' THEN
        RAISE EXCEPTION 'Feedback request is closed and no longer accepting responses';
    END IF;
    
    -- Set default values for text fields
    NEW.strengths := COALESCE(NEW.strengths, '');
    NEW.areas_for_improvement := COALESCE(NEW.areas_for_improvement, '');
    NEW.submitted_at := CASE 
        WHEN NEW.status = 'submitted' THEN NOW()
        ELSE NULL
    END;

    RETURN NEW;
END;
$$; 