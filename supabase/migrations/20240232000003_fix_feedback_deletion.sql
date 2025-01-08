-- Document the fix for feedback deletion issue
-- The issue was that feedback responses with previous_version_id references couldn't be deleted
-- We fixed it by first removing the reference and then deleting the target response

-- For future reference, here's how to handle similar cases:
-- 1. First remove the reference
UPDATE feedback_responses 
SET previous_version_id = NULL 
WHERE id = 'eb168adc-4a2c-4b34-8050-ad2d51eedbde';

-- 2. Then delete the target response
DELETE FROM feedback_responses 
WHERE id = '71b5f658-66e0-4235-b65c-f78bf377e3e0';

-- Create a function to handle this automatically in the future
CREATE OR REPLACE FUNCTION delete_feedback_with_references(feedback_id uuid) 
RETURNS void 
LANGUAGE plpgsql 
AS $$ 
BEGIN
    -- First, null out any references to this feedback
    UPDATE feedback_responses 
    SET previous_version_id = NULL 
    WHERE previous_version_id = feedback_id;
    
    -- Then delete the feedback itself
    DELETE FROM feedback_responses 
    WHERE id = feedback_id;
END; 
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_feedback_with_references TO authenticated; 