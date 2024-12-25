-- First, let's check the current table structure
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_name = 'feedback_responses';

-- Create a temporary table with the correct structure
CREATE TABLE feedback_responses_new (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_request_id UUID NOT NULL REFERENCES feedback_requests(id),
    relationship TEXT NOT NULL,
    strengths TEXT NOT NULL DEFAULT '',
    areas_for_improvement TEXT NOT NULL DEFAULT '',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Copy data from old table
INSERT INTO feedback_responses_new (
    id,
    feedback_request_id,
    relationship,
    strengths,
    areas_for_improvement,
    submitted_at,
    created_at
)
SELECT 
    id,
    feedback_request_id,
    relationship,
    COALESCE(strengths, ''),
    COALESCE(areas_for_improvement, ''),
    submitted_at,
    submitted_at as created_at
FROM 
    feedback_responses;

-- Drop old table and rename new one
DROP TABLE feedback_responses;
ALTER TABLE feedback_responses_new RENAME TO feedback_responses;

-- Create a simple trigger
CREATE OR REPLACE FUNCTION handle_feedback_response()
RETURNS TRIGGER AS $$
BEGIN
    NEW.submitted_at := NOW();
    NEW.created_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_feedback_response
    BEFORE INSERT ON feedback_responses
    FOR EACH ROW
    EXECUTE FUNCTION handle_feedback_response();

-- Create minimal RLS policies
CREATE POLICY "Anyone can submit feedback responses"
ON feedback_responses
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Anyone can view feedback requests"
ON feedback_requests
FOR SELECT
TO anon
USING (true);

-- Grant minimal permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON feedback_requests TO anon;
GRANT INSERT ON feedback_responses TO anon;

-- Verify the structure
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_name = 'feedback_responses'
ORDER BY 
    ordinal_position; 