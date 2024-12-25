-- Fix duplicate foreign keys in ai_reports
ALTER TABLE ai_reports
DROP CONSTRAINT IF EXISTS feedback_request_id_fkey,
DROP CONSTRAINT IF EXISTS ai_reports_feedback_request_id_fkey;

ALTER TABLE ai_reports
ADD CONSTRAINT ai_reports_feedback_request_id_fkey 
FOREIGN KEY (feedback_request_id) 
REFERENCES feedback_requests(id) 
ON DELETE CASCADE;

-- Fix duplicate foreign keys in feedback_responses
ALTER TABLE feedback_responses
DROP CONSTRAINT IF EXISTS feedback_request_id_fkey,
DROP CONSTRAINT IF EXISTS feedback_responses_feedback_request_id_fkey;

ALTER TABLE feedback_responses
ADD CONSTRAINT feedback_responses_feedback_request_id_fkey 
FOREIGN KEY (feedback_request_id) 
REFERENCES feedback_requests(id) 
ON DELETE CASCADE;

-- Add missing updated_at to feedback_requests
ALTER TABLE feedback_requests
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for all tables with updated_at
DO $$
BEGIN
    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS update_ai_reports_updated_at ON ai_reports;
    DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
    DROP TRIGGER IF EXISTS update_feedback_requests_updated_at ON feedback_requests;
    DROP TRIGGER IF EXISTS update_page_views_updated_at ON page_views;
    DROP TRIGGER IF EXISTS update_review_cycles_updated_at ON review_cycles;
    
    -- Create new triggers
    CREATE TRIGGER update_ai_reports_updated_at
        BEFORE UPDATE ON ai_reports
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    CREATE TRIGGER update_employees_updated_at
        BEFORE UPDATE ON employees
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    CREATE TRIGGER update_feedback_requests_updated_at
        BEFORE UPDATE ON feedback_requests
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    CREATE TRIGGER update_page_views_updated_at
        BEFORE UPDATE ON page_views
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    
    CREATE TRIGGER update_review_cycles_updated_at
        BEFORE UPDATE ON review_cycles
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
END $$; 