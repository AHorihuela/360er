-- Update existing feedback requests to have target_responses = 10
UPDATE feedback_requests
SET target_responses = 10
WHERE target_responses = 3;

-- Verify the update
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM feedback_requests 
        WHERE target_responses = 3
    ) THEN
        RAISE EXCEPTION 'Some feedback requests still have target_responses = 3';
    END IF;
END $$; 