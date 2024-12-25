-- Drop all existing constraints first
DO $$ 
BEGIN
    -- Drop existing constraints
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
END $$;

-- Recreate the views to match the query structure
DROP VIEW IF EXISTS review_cycles_with_feedback CASCADE;

CREATE VIEW review_cycles_with_feedback AS
SELECT 
    rc.id,
    rc.title,
    rc.status,
    rc.review_by_date,
    rc.created_at,
    rc.updated_at,
    rc.user_id,
    fr.id as feedback_request_id,
    fr.status as request_status,
    fr.target_responses,
    fr.created_at as request_created_at,
    fr.updated_at as request_updated_at,
    fr.manually_completed,
    fr.review_cycle_id,
    fr.employee_id,
    fr.unique_link,
    ar.id as ai_report_id,
    ar.status as ai_report_status,
    ar.is_final,
    ar.created_at as ai_report_created_at,
    ar.updated_at as ai_report_updated_at,
    ar.error as ai_report_error,
    ar.content as ai_report_content,
    fres.id as response_id,
    fres.status as response_status,
    fres.created_at as response_created_at,
    fres.submitted_at as response_submitted_at,
    fres.relationship,
    fres.strengths,
    fres.areas_for_improvement,
    fres.overall_rating
FROM review_cycles rc
LEFT JOIN feedback_requests fr ON fr.review_cycle_id = rc.id
LEFT JOIN ai_reports ar ON ar.feedback_request_id = fr.id
LEFT JOIN feedback_responses fres ON fres.feedback_request_id = fr.id;

-- Add back constraints with unique names
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

-- Verify the view and constraints
SELECT * FROM review_cycles_with_feedback LIMIT 1;

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