-- Drop existing policies for feedback requests
DROP POLICY IF EXISTS "anon_view_feedback_requests" ON feedback_requests;
DROP POLICY IF EXISTS "Users can view feedback requests for their review cycles" ON feedback_requests;

-- Create new policies that handle both cases
CREATE POLICY "view_feedback_requests_by_unique_link"
ON feedback_requests
FOR SELECT
TO public -- This applies to both authenticated and anonymous users
USING (
    unique_link IS NOT NULL
);

CREATE POLICY "users_view_own_feedback_requests"
ON feedback_requests
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM review_cycles rc
        WHERE rc.id = review_cycle_id
        AND rc.user_id = auth.uid()
    )
);

-- Ensure proper permissions are granted
GRANT SELECT ON feedback_requests TO anon;
GRANT SELECT ON feedback_requests TO authenticated; 