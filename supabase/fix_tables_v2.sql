-- Add missing columns to ai_reports
ALTER TABLE ai_reports
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS error TEXT;

-- Add missing columns to review_cycles
ALTER TABLE review_cycles
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Now create the view with the correct structure
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
    fr.id as feedback_request_id,
    fr.status as feedback_request_status,
    fr.target_responses,
    fr.manually_completed,
    fr.employee_id,
    fr.unique_link,
    ar.id as ai_report_id,
    ar.status as ai_report_status,
    ar.is_final,
    ar.error as ai_report_error,
    ar.content as ai_report_content,
    fres.id as feedback_response_id,
    fres.relationship,
    fres.strengths,
    fres.areas_for_improvement,
    fres.overall_rating,
    fres.submitted_at
FROM review_cycles rc
LEFT JOIN feedback_requests fr ON fr.review_cycle_id = rc.id
LEFT JOIN ai_reports ar ON ar.feedback_request_id = fr.id
LEFT JOIN feedback_responses fres ON fres.feedback_request_id = fr.id;

-- Grant access to the view
GRANT SELECT ON review_cycles_with_feedback TO authenticated; 