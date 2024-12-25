-- Drop existing views
DROP VIEW IF EXISTS review_cycles_with_feedback;
DROP VIEW IF EXISTS user_review_cycles;

-- Recreate the views with security barrier
CREATE VIEW review_cycles_with_feedback WITH (security_barrier) AS
SELECT 
    rc.id,
    rc.title,
    rc.status,
    rc.review_by_date,
    rc.created_at,
    rc.updated_at,
    rc.user_id,
    fr.id AS feedback_request_id,
    fr.status AS feedback_request_status,
    fr.target_responses,
    fr.manually_completed,
    fr.employee_id,
    fr.unique_link,
    ar.id AS ai_report_id,
    COALESCE(ar.status, 'pending') AS ai_report_status,
    COALESCE(ar.is_final, false) AS is_final,
    ar.error AS ai_report_error,
    ar.content AS ai_report_content,
    fres.id AS feedback_response_id,
    fres.status AS feedback_response_status,
    fres.relationship,
    fres.strengths,
    fres.areas_for_improvement,
    fres.overall_rating,
    fres.submitted_at,
    pv.id AS page_view_id,
    pv.session_id,
    pv.page_url,
    pv.created_at AS page_view_created_at
FROM review_cycles rc
LEFT JOIN feedback_requests fr ON fr.review_cycle_id = rc.id
LEFT JOIN ai_reports ar ON ar.feedback_request_id = fr.id
LEFT JOIN feedback_responses fres ON fres.feedback_request_id = fr.id
LEFT JOIN page_views pv ON pv.feedback_request_id = fr.id
WHERE rc.user_id = auth.uid();

CREATE VIEW user_review_cycles WITH (security_barrier) AS
WITH feedback_counts AS (
    SELECT 
        rc.id AS review_cycle_id,
        COUNT(DISTINCT fr.id) AS feedback_request_count,
        COUNT(DISTINCT CASE WHEN fr.status = 'completed' THEN fr.id END) AS completed_feedback_count
    FROM review_cycles rc
    LEFT JOIN feedback_requests fr ON fr.review_cycle_id = rc.id
    WHERE rc.user_id = auth.uid()
    GROUP BY rc.id
)
SELECT 
    rc.id,
    rc.title,
    rc.status,
    rc.created_at,
    rc.created_by,
    rc.review_by_date,
    rc.user_id,
    fr.id AS feedback_request_id,
    fr.status AS feedback_request_status,
    fr.target_responses,
    e.name AS employee_name,
    e.role AS employee_role,
    COALESCE(fc.feedback_request_count, 0) AS feedback_request_count,
    COALESCE(fc.completed_feedback_count, 0) AS completed_feedback_count
FROM review_cycles rc
LEFT JOIN feedback_requests fr ON fr.review_cycle_id = rc.id
LEFT JOIN employees e ON e.id = fr.employee_id
LEFT JOIN feedback_counts fc ON fc.review_cycle_id = rc.id
WHERE rc.user_id = auth.uid(); 