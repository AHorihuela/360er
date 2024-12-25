DO $$ 
BEGIN
    -- Drop all existing constraints
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'ai_reports' 
               AND constraint_name = 'feedback_request_id_fkey') THEN
        ALTER TABLE ai_reports DROP CONSTRAINT feedback_request_id_fkey;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'feedback_responses' 
               AND constraint_name = 'feedback_request_id_fkey') THEN
        ALTER TABLE feedback_responses DROP CONSTRAINT feedback_request_id_fkey;
    END IF;

    -- Drop any constraints with the old names
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'ai_reports' 
               AND constraint_name = 'ai_reports_feedback_request_id_fkey') THEN
        ALTER TABLE ai_reports DROP CONSTRAINT ai_reports_feedback_request_id_fkey;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'feedback_responses' 
               AND constraint_name = 'feedback_responses_feedback_request_id_fkey') THEN
        ALTER TABLE feedback_responses DROP CONSTRAINT feedback_responses_feedback_request_id_fkey;
    END IF;
END $$;

-- Add constraints with unique names
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

-- Force schema cache refresh
SELECT pg_notify('pgrst', 'reload schema');

-- Verify constraints
SELECT DISTINCT
    tc.table_name, 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name as foreign_table_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name; 