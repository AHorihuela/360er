-- First, drop all duplicate and conflicting policies
DROP POLICY IF EXISTS "Anyone can submit feedback responses" ON feedback_responses;
DROP POLICY IF EXISTS "Anyone can create page views" ON page_views;
DROP POLICY IF EXISTS "Anyone can view feedback requests" ON feedback_requests;
DROP POLICY IF EXISTS "Anyone can view feedback requests by unique_link" ON feedback_requests;
DROP POLICY IF EXISTS "Anyone can view employees" ON employees;
DROP POLICY IF EXISTS "Anyone can view review cycles" ON review_cycles;
DROP POLICY IF EXISTS "Public can insert page views for feedback requests" ON page_views;
DROP POLICY IF EXISTS "Users can insert their own page views" ON page_views;
DROP POLICY IF EXISTS "Users can view their own page views" ON page_views;

-- Revoke all permissions to start fresh
REVOKE ALL ON feedback_responses FROM anon;
REVOKE ALL ON page_views FROM anon;
REVOKE ALL ON feedback_requests FROM anon;
REVOKE ALL ON employees FROM anon;
REVOKE ALL ON review_cycles FROM anon;

-- Create clean policies for anonymous access
CREATE POLICY "anon_submit_feedback"
ON feedback_responses
FOR INSERT
TO anon
WITH CHECK (
    EXISTS (
        SELECT 1 FROM feedback_requests fr
        WHERE fr.id = feedback_request_id
        AND fr.status != 'completed'
    )
);

CREATE POLICY "anon_view_feedback_requests"
ON feedback_requests
FOR SELECT
TO anon
USING (true);

CREATE POLICY "anon_view_employees"
ON employees
FOR SELECT
TO anon
USING (true);

CREATE POLICY "anon_view_review_cycles"
ON review_cycles
FOR SELECT
TO anon
USING (true);

CREATE POLICY "anon_create_page_views"
ON page_views
FOR INSERT
TO anon
WITH CHECK (true);

-- Grant minimal necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON feedback_responses TO anon;
GRANT INSERT ON page_views TO anon;
GRANT SELECT ON feedback_requests TO anon;
GRANT SELECT ON employees TO anon;
GRANT SELECT ON review_cycles TO anon; 