-- First, let's check the table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'feedback_responses';

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can submit feedback responses" ON feedback_responses;
DROP POLICY IF EXISTS "Anyone can view feedback requests by unique_link" ON feedback_requests;
DROP POLICY IF EXISTS "Anyone can view employees" ON employees;
DROP POLICY IF EXISTS "Anyone can view review cycles" ON review_cycles;

-- Create more permissive policies for anonymous feedback
CREATE POLICY "Anyone can view feedback requests by unique_link"
ON feedback_requests
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anyone can view employees"
ON employees
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anyone can view review cycles"
ON review_cycles
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anyone can submit feedback responses"
ON feedback_responses
FOR INSERT
TO anon
WITH CHECK (true);

-- Enable RLS
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_cycles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT ON feedback_requests TO anon;
GRANT SELECT ON employees TO anon;
GRANT SELECT ON review_cycles TO anon;
GRANT INSERT ON feedback_responses TO anon;

-- Grant access to referenced tables
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Add debug logging trigger
CREATE OR REPLACE FUNCTION log_feedback_insert()
RETURNS TRIGGER AS $$
BEGIN
  RAISE NOTICE 'Attempting to insert feedback: %', NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_feedback_insert
BEFORE INSERT ON feedback_responses
FOR EACH ROW
EXECUTE FUNCTION log_feedback_insert();