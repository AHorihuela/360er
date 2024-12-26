-- Enable RLS on all tables
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "anon_view_feedback_requests" ON feedback_requests;
DROP POLICY IF EXISTS "anon_view_review_cycles" ON review_cycles;
DROP POLICY IF EXISTS "anon_submit_feedback_responses" ON feedback_responses;

-- Create policy for anonymous users to view feedback requests by unique link
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
);

-- Create policy for anonymous users to view review cycles
CREATE POLICY "anon_view_review_cycles"
ON review_cycles
FOR SELECT
TO anon
USING (true);

-- Create policy for anonymous users to submit feedback
CREATE POLICY "anon_submit_feedback_responses"
ON feedback_responses
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM feedback_requests fr
    WHERE fr.id = feedback_request_id
    AND EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = fr.review_cycle_id
      AND rc.review_by_date > CURRENT_DATE
    )
  )
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON feedback_requests TO anon;
GRANT SELECT ON review_cycles TO anon;
GRANT SELECT, INSERT ON feedback_responses TO anon; 