-- Rename feedback_responses constraint
ALTER TABLE feedback_responses
DROP CONSTRAINT IF EXISTS feedback_responses_feedback_request_id_fkey;

ALTER TABLE feedback_responses
ADD CONSTRAINT feedback_request_id_fkey 
FOREIGN KEY (feedback_request_id) 
REFERENCES feedback_requests(id) 
ON DELETE CASCADE;

-- Rename ai_reports constraint
ALTER TABLE ai_reports
DROP CONSTRAINT IF EXISTS ai_reports_feedback_request_id_fkey;

ALTER TABLE ai_reports
ADD CONSTRAINT feedback_request_id_fkey 
FOREIGN KEY (feedback_request_id) 
REFERENCES feedback_requests(id) 
ON DELETE CASCADE;

-- The review_cycles_id_fkey constraint is already correct
-- The page_views constraint can stay as is since it's not referenced in the query 