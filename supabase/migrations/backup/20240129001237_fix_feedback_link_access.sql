-- Drop the incorrect policy
DROP POLICY IF EXISTS "anon_view_feedback_requests" ON feedback_requests;

-- Create corrected policy for anonymous users to view feedback requests by unique link
CREATE POLICY "anon_view_feedback_requests"
ON feedback_requests
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM review_cycles rc
    WHERE rc.id = review_cycle_id
    AND rc.review_by_date > CURRENT_DATE
  )
  AND unique_link IS NOT NULL
); 