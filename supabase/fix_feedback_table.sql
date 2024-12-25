-- Drop existing triggers
DROP TRIGGER IF EXISTS handle_feedback_response_insert ON feedback_responses;
DROP TRIGGER IF EXISTS log_feedback_insert ON feedback_responses;
DROP FUNCTION IF EXISTS handle_feedback_response_insert();
DROP FUNCTION IF EXISTS log_feedback_insert();

-- Drop existing sequence
DROP SEQUENCE IF EXISTS feedback_responses_id_seq;

-- Recreate the table with proper structure
CREATE TABLE IF NOT EXISTS feedback_responses_new (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_request_id UUID NOT NULL REFERENCES feedback_requests(id),
    relationship TEXT NOT NULL,
    strengths TEXT NOT NULL DEFAULT '',
    areas_for_improvement TEXT NOT NULL DEFAULT '',
    overall_rating INTEGER,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Copy data from old table if it exists
INSERT INTO feedback_responses_new (
    feedback_request_id,
    relationship,
    strengths,
    areas_for_improvement,
    overall_rating,
    submitted_at
)
SELECT 
    feedback_request_id,
    relationship,
    strengths,
    areas_for_improvement,
    overall_rating,
    submitted_at
FROM feedback_responses;

-- Drop old table and rename new one
DROP TABLE feedback_responses;
ALTER TABLE feedback_responses_new RENAME TO feedback_responses;

-- Create the trigger function
CREATE OR REPLACE FUNCTION handle_feedback_response_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Set the submitted_at timestamp
    NEW.submitted_at := NOW();

    -- Update the feedback request status
    UPDATE feedback_requests
    SET status = 'completed'
    WHERE id = NEW.feedback_request_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER handle_feedback_response_insert
    BEFORE INSERT ON feedback_responses
    FOR EACH ROW
    EXECUTE FUNCTION handle_feedback_response_insert();

-- Set up RLS policies
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit feedback responses" ON feedback_responses;
CREATE POLICY "Anyone can submit feedback responses"
ON feedback_responses
FOR INSERT
TO anon
WITH CHECK (true);

-- Grant necessary permissions
GRANT INSERT ON feedback_responses TO anon;
GRANT USAGE ON SCHEMA public TO anon; 