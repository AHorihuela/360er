-- Check all temporal relationships
WITH temporal_checks AS (
    -- Check review_cycles -> feedback_requests
    SELECT 
        'review_cycle -> request' as check_type,
        rc.id as parent_id,
        fr.id as child_id,
        rc.created_at as parent_time,
        fr.created_at as child_time,
        fr.created_at < rc.created_at as is_invalid
    FROM review_cycles rc
    JOIN feedback_requests fr ON fr.review_cycle_id = rc.id
    
    UNION ALL
    
    -- Check feedback_requests -> feedback_responses
    SELECT 
        'request -> response' as check_type,
        fr.id as parent_id,
        fres.id as child_id,
        fr.created_at as parent_time,
        fres.created_at as child_time,
        fres.created_at < fr.created_at as is_invalid
    FROM feedback_requests fr
    JOIN feedback_responses fres ON fres.feedback_request_id = fr.id
    
    UNION ALL
    
    -- Check feedback_requests -> ai_reports
    SELECT 
        'request -> ai_report' as check_type,
        fr.id as parent_id,
        ar.id as child_id,
        fr.created_at as parent_time,
        ar.created_at as child_time,
        ar.created_at < fr.created_at as is_invalid
    FROM feedback_requests fr
    JOIN ai_reports ar ON ar.feedback_request_id = fr.id
)
SELECT * FROM temporal_checks 
WHERE is_invalid = true; 