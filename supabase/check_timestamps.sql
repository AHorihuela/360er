-- Check for feedback requests created before their review cycles
SELECT 
    fr.id as request_id,
    fr.created_at as request_created,
    rc.created_at as cycle_created,
    rc.id as cycle_id,
    fr.created_at < rc.created_at as is_invalid
FROM feedback_requests fr
JOIN review_cycles rc ON rc.id = fr.review_cycle_id
WHERE fr.created_at < rc.created_at;

-- Check for ai_reports created before their feedback requests
SELECT 
    ar.id as report_id,
    ar.created_at as report_created,
    fr.created_at as request_created,
    fr.id as request_id,
    ar.created_at < fr.created_at as is_invalid
FROM ai_reports ar
JOIN feedback_requests fr ON fr.id = ar.feedback_request_id
WHERE ar.created_at < fr.created_at;

-- Check for feedback responses created before their feedback requests
SELECT 
    fres.id as response_id,
    fres.created_at as response_created,
    fr.created_at as request_created,
    fr.id as request_id,
    fres.created_at < fr.created_at as is_invalid
FROM feedback_responses fres
JOIN feedback_requests fr ON fr.id = fres.feedback_request_id
WHERE fres.created_at < fr.created_at; 