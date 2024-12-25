-- Drop and recreate the view with COALESCE for nullable fields
DROP VIEW IF EXISTS review_cycles_with_feedback;

CREATE VIEW review_cycles_with_feedback AS
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
LEFT JOIN page_views pv ON pv.feedback_request_id = fr.id; 