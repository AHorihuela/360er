-- Drop existing constraints
ALTER TABLE feedback_requests 
    DROP CONSTRAINT IF EXISTS feedback_requests_review_cycle_id_fkey,
    DROP CONSTRAINT IF EXISTS feedback_requests_employee_id_fkey;

ALTER TABLE feedback_responses
    DROP CONSTRAINT IF EXISTS feedback_responses_new_feedback_request_id_fkey1;

ALTER TABLE ai_reports
    DROP CONSTRAINT IF EXISTS ai_reports_feedback_request_id_fkey;

-- Add constraints with correct names
ALTER TABLE feedback_requests
    ADD CONSTRAINT review_cycles_id_fkey 
        FOREIGN KEY (review_cycle_id) 
        REFERENCES review_cycles(id) 
        ON DELETE CASCADE,
    ADD CONSTRAINT employees_id_fkey 
        FOREIGN KEY (employee_id) 
        REFERENCES employees(id) 
        ON DELETE CASCADE;

ALTER TABLE feedback_responses
    ADD CONSTRAINT feedback_request_id_fkey 
        FOREIGN KEY (feedback_request_id) 
        REFERENCES feedback_requests(id) 
        ON DELETE CASCADE;

ALTER TABLE ai_reports
    ADD CONSTRAINT feedback_request_id_fkey 
        FOREIGN KEY (feedback_request_id) 
        REFERENCES feedback_requests(id) 
        ON DELETE CASCADE; 