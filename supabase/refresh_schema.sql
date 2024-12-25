-- Drop and recreate the foreign key constraints to force schema refresh
ALTER TABLE ai_reports
DROP CONSTRAINT IF EXISTS feedback_request_id_fkey,
DROP CONSTRAINT IF EXISTS ai_reports_feedback_request_id_fkey;

ALTER TABLE feedback_responses
DROP CONSTRAINT IF EXISTS feedback_request_id_fkey,
DROP CONSTRAINT IF EXISTS feedback_responses_feedback_request_id_fkey;

-- Add back the constraints with the exact names used in the query
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

-- Force PostgREST to reload its schema cache
SELECT pg_notify('pgrst', 'reload schema');

-- Verify the constraints
SELECT 
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
  AND tc.constraint_name IN ('feedback_request_id_fkey', 'review_cycles_id_fkey'); 