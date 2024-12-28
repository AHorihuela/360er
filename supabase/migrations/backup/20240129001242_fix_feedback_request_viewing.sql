-- Drop existing policies
DROP POLICY IF EXISTS "anon_access_feedback_requests" ON feedback_requests;

-- Create policy for anonymous feedback request access
CREATE POLICY "anon_access_feedback_requests"
ON feedback_requests
FOR SELECT
TO anon
USING (
  unique_link IS NOT NULL
  AND unique_link = ANY(ARRAY[current_setting('request.querystring')::json->>'unique_link', current_setting('request.headers')::json->>'unique_link'])
);

-- Ensure proper permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON feedback_requests TO anon;
GRANT SELECT ON employees TO anon;
GRANT SELECT ON review_cycles TO anon;

-- Add debug logging
DO $$
DECLARE
  v_unique_link text := '0zwS5qYydl8Y';
BEGIN
  -- Log the check
  RAISE NOTICE 'Testing policy for link %', v_unique_link;
  
  -- Test feedback request access
  IF EXISTS (
    SELECT 1 
    FROM feedback_requests 
    WHERE unique_link = v_unique_link
  ) THEN
    RAISE NOTICE 'Can access feedback request: YES';
  ELSE
    RAISE NOTICE 'Can access feedback request: NO';
  END IF;
END $$; 