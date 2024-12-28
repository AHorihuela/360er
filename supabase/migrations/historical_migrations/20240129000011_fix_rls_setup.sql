-- Enable RLS on all tables
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Revoke all permissions to start fresh
REVOKE ALL ON feedback_responses FROM anon;
REVOKE ALL ON feedback_requests FROM anon;
REVOKE ALL ON employees FROM anon;
REVOKE ALL ON review_cycles FROM anon;
REVOKE ALL ON page_views FROM anon;

-- Grant base permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON feedback_requests TO anon;
GRANT SELECT ON employees TO anon;
GRANT SELECT ON review_cycles TO anon;
GRANT SELECT, INSERT ON feedback_responses TO anon;
GRANT INSERT ON page_views TO anon;

-- Drop existing policies for anonymous users
DROP POLICY IF EXISTS "anon_submit_feedback_responses" ON feedback_responses;
DROP POLICY IF EXISTS "anon_view_feedback_responses" ON feedback_responses;
DROP POLICY IF EXISTS "Anyone can view feedback requests by unique_link" ON feedback_requests;
DROP POLICY IF EXISTS "Anyone can view associated employees" ON employees;
DROP POLICY IF EXISTS "Anyone can view associated review cycles" ON review_cycles;
DROP POLICY IF EXISTS "Anyone can create page views" ON page_views;

-- Create fresh policies
DO $$ BEGIN
-- Feedback responses policies
CREATE POLICY "anon_submit_feedback_responses"
ON feedback_responses
FOR INSERT
TO anon
WITH CHECK (true);  -- Temporarily make this permissive for testing

CREATE POLICY "anon_view_feedback_responses"
ON feedback_responses
FOR SELECT
TO anon
USING (true);  -- Temporarily make this permissive for testing

-- Feedback requests policy
CREATE POLICY "anon_view_feedback_requests"
ON feedback_requests
FOR SELECT
TO anon
USING (true);  -- Allow viewing all feedback requests for now

-- Employees policy
CREATE POLICY "anon_view_employees"
ON employees
FOR SELECT
TO anon
USING (true);  -- Allow viewing all employees for now

-- Review cycles policy
CREATE POLICY "anon_view_review_cycles"
ON review_cycles
FOR SELECT
TO anon
USING (true);  -- Allow viewing all review cycles for now

-- Page views policy
CREATE POLICY "anon_create_page_views"
ON page_views
FOR INSERT
TO anon
WITH CHECK (true);  -- Allow creating all page views

EXCEPTION WHEN duplicate_object THEN NULL;
END $$; 