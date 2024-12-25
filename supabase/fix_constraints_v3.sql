-- Drop all existing constraints
DO $$ 
BEGIN
    -- Drop ai_reports constraints
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'ai_reports' 
               AND constraint_name = 'feedback_request_id_fkey') THEN
        ALTER TABLE ai_reports DROP CONSTRAINT feedback_request_id_fkey;
    END IF;

    -- Drop feedback_responses constraints
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'feedback_responses' 
               AND constraint_name = 'feedback_request_id_fkey') THEN
        ALTER TABLE feedback_responses DROP CONSTRAINT feedback_request_id_fkey;
    END IF;
END $$;

-- Add constraints back with unique names
ALTER TABLE ai_reports
ADD CONSTRAINT ai_reports_feedback_request_id_fkey 
FOREIGN KEY (feedback_request_id) 
REFERENCES feedback_requests(id) 
ON DELETE CASCADE;

ALTER TABLE feedback_responses
ADD CONSTRAINT feedback_responses_feedback_request_id_fkey 
FOREIGN KEY (feedback_request_id) 
REFERENCES feedback_requests(id) 
ON DELETE CASCADE;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema'; 