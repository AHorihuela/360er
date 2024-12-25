-- Drop existing foreign key constraints
ALTER TABLE feedback_requests DROP CONSTRAINT IF EXISTS review_cycles_id_fkey;
ALTER TABLE ai_reports DROP CONSTRAINT IF EXISTS ai_reports_feedback_request_id_fkey;
ALTER TABLE feedback_responses DROP CONSTRAINT IF EXISTS feedback_responses_feedback_request_id_fkey;

-- Add constraints with exact names matching the query
ALTER TABLE feedback_requests 
ADD CONSTRAINT review_cycles_id_fkey 
FOREIGN KEY (review_cycle_id) 
REFERENCES review_cycles(id) 
ON DELETE CASCADE;

ALTER TABLE ai_reports 
ADD CONSTRAINT feedback_request_id_fkey 
FOREIGN KEY (feedback_request_id) 
REFERENCES feedback_requests(id) 
ON DELETE CASCADE;

ALTER TABLE feedback_responses 
ADD CONSTRAINT feedback_request_id_fkey 
FOREIGN KEY (feedback_request_id) 
REFERENCES feedback_requests(id) 
ON DELETE CASCADE;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema'; 