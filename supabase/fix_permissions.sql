-- First, revoke all permissions
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON SCHEMA public FROM anon;

-- Enable RLS on all tables
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_cycles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can submit feedback responses" ON feedback_responses;
DROP POLICY IF EXISTS "Anyone can view feedback requests by unique_link" ON feedback_requests;
DROP POLICY IF EXISTS "Anyone can view employees" ON employees;
DROP POLICY IF EXISTS "Anyone can view review cycles" ON review_cycles;

-- Create minimal policies for feedback submission
CREATE POLICY "Anyone can submit feedback responses"
ON feedback_responses
FOR INSERT
TO anon
WITH CHECK (
    feedback_request_id IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM feedback_requests
        WHERE id = feedback_request_id
        AND status = 'pending'
    )
);

CREATE POLICY "Anyone can view feedback requests by unique_link"
ON feedback_requests
FOR SELECT
TO anon
USING (status = 'pending');

CREATE POLICY "Anyone can view employees"
ON employees
FOR SELECT
TO anon
USING (
    id IN (
        SELECT employee_id FROM feedback_requests
        WHERE status = 'pending'
    )
);

CREATE POLICY "Anyone can view review cycles"
ON review_cycles
FOR SELECT
TO anon
USING (
    id IN (
        SELECT review_cycle_id FROM feedback_requests
        WHERE status = 'pending'
    )
);

-- Grant minimal necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON feedback_requests TO anon;
GRANT SELECT ON employees TO anon;
GRANT SELECT ON review_cycles TO anon;
GRANT INSERT ON feedback_responses TO anon;

-- Verify policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies
WHERE 
    tablename IN ('feedback_responses', 'feedback_requests', 'employees', 'review_cycles');

-- Verify permissions
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM 
    information_schema.role_table_grants 
WHERE 
    grantee = 'anon'
    AND table_name IN ('feedback_responses', 'feedback_requests', 'employees', 'review_cycles');
  