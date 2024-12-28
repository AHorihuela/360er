-- Grant SELECT permission on feedback_requests to anon role
GRANT SELECT ON feedback_requests TO anon;

-- Create policy for anonymous users to view feedback requests by unique link
CREATE POLICY "anon_view_feedback_requests"
ON feedback_requests
FOR SELECT
TO anon
USING (
  status = 'pending'
  AND EXISTS (
    SELECT 1 FROM review_cycles rc
    WHERE rc.id = review_cycle_id
    AND rc.review_by_date > CURRENT_DATE
  )
);

-- Grant SELECT on review_cycles to anon role (needed for date check)
GRANT SELECT ON review_cycles TO anon;

-- Create policy for anonymous users to view review cycles
CREATE POLICY "anon_view_review_cycles"
ON review_cycles
FOR SELECT
TO anon
USING (true);

-- Verify and reset any incorrectly set permissions
DO $$
BEGIN
  -- Verify feedback_responses permissions
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles 
    WHERE rolname = 'anon' 
    AND pg_has_role('anon', oid, 'USAGE')
  ) THEN
    RAISE NOTICE 'Resetting anon role permissions...';
    GRANT USAGE ON SCHEMA public TO anon;
    GRANT SELECT, INSERT ON feedback_responses TO anon;
  END IF;
END $$; 