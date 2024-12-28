-- Begin transaction
BEGIN;

-- Grant necessary permissions for all related tables
GRANT SELECT ON feedback_requests TO anon;
GRANT SELECT ON review_cycles TO anon;
GRANT SELECT ON ai_reports TO anon;
GRANT SELECT ON employees TO anon;
GRANT SELECT ON feedback_responses TO anon;

-- Verify complete access chain
WITH request_check AS (
    SELECT 
        fr.id as request_id,
        fr.unique_link,
        e.name as employee_name,
        COUNT(DISTINCT fr_resp.id) as response_count,
        EXISTS (
            SELECT 1 
            FROM ai_reports ar 
            WHERE ar.feedback_request_id = fr.id
        ) as has_ai_report
    FROM feedback_requests fr
    LEFT JOIN employees e ON e.id = fr.employee_id
    LEFT JOIN feedback_responses fr_resp ON fr_resp.feedback_request_id = fr.id
    WHERE fr.id = 'bb6c0412-0ccd-470e-8691-e169e7c4efd5'
    GROUP BY fr.id, fr.unique_link, e.name
)
SELECT 
    request_id,
    unique_link IS NOT NULL as has_unique_link,
    employee_name,
    response_count,
    has_ai_report
FROM request_check;

-- Verify all necessary grants
SELECT 
    grantee, 
    table_name, 
    string_agg(privilege_type, ', ') as privileges
FROM information_schema.role_table_grants 
WHERE table_name IN (
    'ai_reports', 
    'feedback_requests', 
    'review_cycles', 
    'employees', 
    'feedback_responses'
)
AND grantee = 'anon'
GROUP BY grantee, table_name
ORDER BY table_name;

COMMIT; 