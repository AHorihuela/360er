-- Add status field and ensure proper timestamp handling
ALTER TABLE feedback_responses
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'submitted',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_feedback_response_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_feedback_response_timestamp ON feedback_responses;
CREATE TRIGGER update_feedback_response_timestamp
    BEFORE UPDATE ON feedback_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_response_timestamp();

-- Update existing rows to have proper timestamps
UPDATE feedback_responses
SET 
    created_at = submitted_at,
    updated_at = submitted_at,
    status = 'submitted'
WHERE status IS NULL; 