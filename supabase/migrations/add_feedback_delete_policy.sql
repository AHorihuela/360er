-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Users can delete feedback responses" ON feedback_responses;

-- Create policy to allow users to delete feedback responses only from their review cycles
CREATE POLICY "Users can delete feedback responses"
  ON feedback_responses
  FOR DELETE
  TO authenticated
  USING (
    feedback_request_id IN (
      SELECT fr.id 
      FROM feedback_requests fr
      JOIN review_cycles rc ON fr.review_cycle_id = rc.id
      WHERE rc.created_by = auth.uid()
    )
  ); 