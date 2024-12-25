-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_feedback_request_status_trigger ON feedback_responses;
DROP FUNCTION IF EXISTS update_feedback_request_status();

-- Recreate the function with proper column references
CREATE OR REPLACE FUNCTION update_feedback_request_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the status of the feedback request
  UPDATE feedback_requests
  SET status = CASE 
    WHEN (
      SELECT COUNT(*)
      FROM feedback_responses
      WHERE feedback_request_id = NEW.feedback_request_id
    ) >= COALESCE((
      SELECT target_responses 
      FROM feedback_requests 
      WHERE id = NEW.feedback_request_id
    ), 3) THEN 'completed'
    ELSE 'pending'
  END
  WHERE id = NEW.feedback_request_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER update_feedback_request_status_trigger
AFTER INSERT ON feedback_responses
FOR EACH ROW
EXECUTE FUNCTION update_feedback_request_status();

-- Verify the feedback_responses table structure
DO $$ 
BEGIN
  -- Ensure the feedback_request_id column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'feedback_responses' 
    AND column_name = 'feedback_request_id'
  ) THEN
    ALTER TABLE feedback_responses 
    ADD COLUMN feedback_request_id UUID REFERENCES feedback_requests(id);
  END IF;
END $$; 