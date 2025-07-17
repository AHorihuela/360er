-- Migration: Fix handle_feedback_response trigger for Manager-to-Employee feedback
-- Date: January 17, 2025  
-- Purpose: Allow M2E feedback submission without unique_link requirement
--
-- The current trigger requires unique_link IS NOT NULL for all feedback,
-- but M2E feedback uses direct manager submission (no anonymous links needed)

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

    -- Handle linking for in-progress feedback  
    IF NEW.status = 'submitted' THEN
        -- Link to existing in-progress if one exists
        NEW.previous_version_id := (
            SELECT id FROM feedback_responses
            WHERE feedback_request_id = NEW.feedback_request_id
            AND session_id = NEW.session_id
            AND status = 'in_progress'
            ORDER BY submitted_at DESC
            LIMIT 1
        );
    END IF;

    RETURN NEW;
END;
$$; 