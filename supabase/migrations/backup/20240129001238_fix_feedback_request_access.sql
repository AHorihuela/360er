-- Drop existing policies
DROP POLICY IF EXISTS "anon_view_feedback_requests" ON feedback_requests;

-- Create policy for anonymous users to view feedback requests by unique link
CREATE POLICY "anon_view_feedback_requests"
ON feedback_requests
FOR SELECT
TO anon
USING (
  unique_link = COALESCE(
    current_setting('request.jwt.claims', true)::json->>'unique_link',
    NULLIF(current_setting('request.headers', true)::json->>'unique_link', '')
  )
  OR unique_link = ANY(string_to_array(NULLIF(current_setting('request.querystring', true)::json->>'unique_link', ''), ','))
);

-- Enable RLS
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;

-- Ensure permissions are granted
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON feedback_requests TO anon;
GRANT SELECT ON review_cycles TO anon;
GRANT SELECT ON employees TO anon;

-- Add policy for employees table
DROP POLICY IF EXISTS "anon_view_employees" ON employees;
CREATE POLICY "anon_view_employees"
ON employees
FOR SELECT
TO anon
USING (
  id IN (
    SELECT employee_id 
    FROM feedback_requests 
    WHERE unique_link IS NOT NULL
  )
); 