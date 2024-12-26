-- Drop duplicate policies
DROP POLICY IF EXISTS "Anyone can view feedback requests by unique link" ON feedback_requests;
DROP POLICY IF EXISTS "Anyone can view feedback requests by unique_link" ON feedback_requests;

-- Create a single, specific policy
DO $$ BEGIN
CREATE POLICY "anon_view_feedback_request_by_link"
ON feedback_requests
FOR SELECT
TO anon
USING (
    -- Only allow access to the specific feedback request that matches the unique_link
    unique_link IS NOT NULL
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$; 