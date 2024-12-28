-- Drop existing policies
DROP POLICY IF EXISTS "anon_access_feedback_requests" ON feedback_requests;

-- Create simple policy for anonymous feedback request access
CREATE POLICY "anon_access_feedback_requests"
ON feedback_requests
FOR SELECT
TO anon
USING (
  unique_link IS NOT NULL
);

-- Ensure proper permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON feedback_requests TO anon;
GRANT SELECT ON employees TO anon;
GRANT SELECT ON review_cycles TO anon;

-- Add debug logging
DO $$
DECLARE
  v_unique_link text := 'jBa26kdzeHqO';
BEGIN
  -- Log the check
  RAISE NOTICE 'Testing policy for link %', v_unique_link;
  
  -- Test feedback request access
  IF EXISTS (
    SELECT 1 
    FROM feedback_requests fr
    WHERE fr.unique_link = v_unique_link
  ) THEN
    RAISE NOTICE 'Can access feedback request: YES';
    
    -- Also test related data access
    IF EXISTS (
      SELECT 1 
      FROM feedback_requests fr
      JOIN employees e ON e.id = fr.employee_id
      JOIN review_cycles rc ON rc.id = fr.review_cycle_id
      WHERE fr.unique_link = v_unique_link
    ) THEN
      RAISE NOTICE 'Can access all related data: YES';
    ELSE
      RAISE NOTICE 'Can access all related data: NO';
    END IF;
  ELSE
    RAISE NOTICE 'Can access feedback request: NO';
  END IF;
END $$; 