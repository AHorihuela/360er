-- Begin transaction
BEGIN;

-- Grant necessary permissions for dependent tables
GRANT SELECT ON feedback_requests TO anon;
GRANT SELECT ON review_cycles TO anon;
GRANT SELECT ON ai_reports TO anon;

-- Verify grants
SELECT 
    grantee, table_name, privilege_type
FROM information_schema.role_table_grants 
WHERE table_name IN ('ai_reports', 'feedback_requests', 'review_cycles')
AND grantee = 'anon';

-- Verify RLS policies are working
SELECT EXISTS (
    SELECT 1 
    FROM feedback_requests fr
    WHERE fr.id = 'bb6c0412-0ccd-470e-8691-e169e7c4efd5'
    AND fr.unique_link IS NOT NULL
) as feedback_request_accessible;

SELECT EXISTS (
    SELECT 1 
    FROM ai_reports ar
    JOIN feedback_requests fr ON fr.id = ar.feedback_request_id
    WHERE fr.id = 'bb6c0412-0ccd-470e-8691-e169e7c4efd5'
    AND fr.unique_link IS NOT NULL
) as ai_report_accessible;

COMMIT; 