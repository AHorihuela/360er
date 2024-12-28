-- First, revoke all permissions
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON SCHEMA public FROM anon;

-- Enable RLS
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_cycles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can submit feedback responses" ON feedback_responses;
DROP POLICY IF EXISTS "Anyone can create page views" ON page_views;
DROP POLICY IF EXISTS "Anyone can view feedback requests by unique_link" ON feedback_requests;
DROP POLICY IF EXISTS "Anyone can view employees" ON employees;
DROP POLICY IF EXISTS "Anyone can view review cycles" ON review_cycles;

-- Create minimal policies for feedback submission
CREATE POLICY "Anyone can submit feedback responses"
ON feedback_responses
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Anyone can create page views"
ON page_views
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Anyone can view feedback requests"
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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON feedback_responses TO anon;
GRANT ALL ON page_views TO anon;
GRANT SELECT ON feedback_requests TO anon;
GRANT SELECT ON employees TO anon;
GRANT SELECT ON review_cycles TO anon; 