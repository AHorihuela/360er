-- First, drop all existing policies
DROP POLICY IF EXISTS "Anyone can submit feedback responses" ON feedback_responses;
DROP POLICY IF EXISTS "Anyone can create page views" ON page_views;
DROP POLICY IF EXISTS "Anyone can view feedback requests" ON feedback_requests;
DROP POLICY IF EXISTS "Anyone can view feedback requests by unique_link" ON feedback_requests;
DROP POLICY IF EXISTS "Anyone can view employees" ON employees;
DROP POLICY IF EXISTS "Anyone can view review cycles" ON review_cycles;
DROP POLICY IF EXISTS "anon_submit_feedback" ON feedback_responses;
DROP POLICY IF EXISTS "anon_view_feedback_requests" ON feedback_requests;
DROP POLICY IF EXISTS "anon_view_employees" ON employees;
DROP POLICY IF EXISTS "anon_view_review_cycles" ON review_cycles;
DROP POLICY IF EXISTS "anon_create_page_views" ON page_views;

-- Revoke all permissions to start fresh
REVOKE ALL ON feedback_responses FROM anon;
REVOKE ALL ON page_views FROM anon;
REVOKE ALL ON feedback_requests FROM anon;
REVOKE ALL ON employees FROM anon;
REVOKE ALL ON review_cycles FROM anon;

-- Create policies for viewing feedback requests by unique link
DO $$ BEGIN
CREATE POLICY "Anyone can view feedback requests by unique_link"
ON feedback_requests
FOR SELECT
TO anon
USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create policies for viewing associated data
DO $$ BEGIN
CREATE POLICY "Anyone can view associated employees"
ON employees
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM feedback_requests fr
        WHERE fr.employee_id = id
    )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "Anyone can view associated review cycles"
ON review_cycles
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM feedback_requests fr
        WHERE fr.review_cycle_id = id
    )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create policy for page views
DO $$ BEGIN
CREATE POLICY "Anyone can create page views"
ON page_views
FOR INSERT
TO anon
WITH CHECK (
    EXISTS (
        SELECT 1 FROM feedback_requests fr
        WHERE fr.id = feedback_request_id
    )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Grant minimal necessary permissions for viewing
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON feedback_requests TO anon;
GRANT SELECT ON employees TO anon;
GRANT SELECT ON review_cycles TO anon;
GRANT INSERT ON page_views TO anon;

-- Note: We'll handle feedback submission in a separate migration
-- after confirming viewing functionality works 