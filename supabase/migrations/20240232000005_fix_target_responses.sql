-- Update existing records to have target_responses = 10
UPDATE feedback_requests
SET target_responses = 10
WHERE target_responses = 3;

-- Change the default value for target_responses
ALTER TABLE feedback_requests 
ALTER COLUMN target_responses SET DEFAULT 10;

-- Verify the changes
DO $$
BEGIN
    -- Check if any records still have target_responses = 3
    IF EXISTS (
        SELECT 1 
        FROM feedback_requests 
        WHERE target_responses = 3
    ) THEN
        RAISE EXCEPTION 'Some feedback requests still have target_responses = 3';
    END IF;

    -- Check if default value was updated
    IF (
        SELECT column_default 
        FROM information_schema.columns 
        WHERE table_name = 'feedback_requests' 
        AND column_name = 'target_responses'
    ) != '10' THEN
        RAISE EXCEPTION 'Default value for target_responses was not updated to 10';
    END IF;
END $$; 