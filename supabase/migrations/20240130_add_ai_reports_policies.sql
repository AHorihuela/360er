-- Enable RLS on ai_reports table
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select their own reports
CREATE POLICY "Users can view their AI reports"
ON ai_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM feedback_requests fr
    JOIN review_cycles rc ON fr.review_cycle_id = rc.id
    WHERE fr.id = ai_reports.feedback_request_id
    AND rc.created_by = auth.uid()
  )
);

-- Allow authenticated users to insert their own reports
CREATE POLICY "Users can create AI reports"
ON ai_reports
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM feedback_requests fr
    JOIN review_cycles rc ON fr.review_cycle_id = rc.id
    WHERE fr.id = ai_reports.feedback_request_id
    AND rc.created_by = auth.uid()
  )
);

-- Allow authenticated users to update their own reports
CREATE POLICY "Users can update their AI reports"
ON ai_reports
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM feedback_requests fr
    JOIN review_cycles rc ON fr.review_cycle_id = rc.id
    WHERE fr.id = ai_reports.feedback_request_id
    AND rc.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM feedback_requests fr
    JOIN review_cycles rc ON fr.review_cycle_id = rc.id
    WHERE fr.id = ai_reports.feedback_request_id
    AND rc.created_by = auth.uid()
  )
);

-- Allow authenticated users to delete their own reports
CREATE POLICY "Users can delete their AI reports"
ON ai_reports
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM feedback_requests fr
    JOIN review_cycles rc ON fr.review_cycle_id = rc.id
    WHERE fr.id = ai_reports.feedback_request_id
    AND rc.created_by = auth.uid()
  )
); 