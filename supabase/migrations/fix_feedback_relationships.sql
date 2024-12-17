-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_requests_unique_link ON feedback_requests(unique_link);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_review_cycle_id ON feedback_requests(review_cycle_id);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_employee_id ON feedback_requests(employee_id);

-- Ensure foreign key constraints are properly set up
ALTER TABLE feedback_requests
  DROP CONSTRAINT IF EXISTS feedback_requests_review_cycle_id_fkey,
  DROP CONSTRAINT IF EXISTS feedback_requests_employee_id_fkey;

ALTER TABLE feedback_requests
  ADD CONSTRAINT feedback_requests_review_cycle_id_fkey 
  FOREIGN KEY (review_cycle_id) 
  REFERENCES review_cycles(id) 
  ON DELETE CASCADE;

ALTER TABLE feedback_requests
  ADD CONSTRAINT feedback_requests_employee_id_fkey 
  FOREIGN KEY (employee_id) 
  REFERENCES employees(id) 
  ON DELETE CASCADE;

-- Enable RLS on all tables again to ensure policies are applied
ALTER TABLE review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY; 