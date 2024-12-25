-- Update feedback_requests timestamps to be at least equal to their review cycle's created_at
WITH request_updates AS (
    SELECT 
        fr.id as request_id,
        rc.created_at as new_created_at
    FROM feedback_requests fr
    JOIN review_cycles rc ON rc.id = fr.review_cycle_id
    WHERE fr.created_at < rc.created_at
)
UPDATE feedback_requests
SET 
    created_at = ru.new_created_at,
    updated_at = GREATEST(updated_at, ru.new_created_at)
FROM request_updates ru
WHERE feedback_requests.id = ru.request_id;

-- Also update related feedback_responses and ai_reports
UPDATE feedback_responses
SET 
    created_at = fr.created_at,
    updated_at = GREATEST(updated_at, fr.created_at),
    submitted_at = GREATEST(submitted_at, fr.created_at)
FROM feedback_requests fr
WHERE fr.id = feedback_responses.feedback_request_id
AND feedback_responses.created_at < fr.created_at;

UPDATE ai_reports
SET 
    created_at = fr.created_at,
    updated_at = GREATEST(updated_at, fr.created_at)
FROM feedback_requests fr
WHERE fr.id = ai_reports.feedback_request_id
AND ai_reports.created_at < fr.created_at;

-- Verify the fix
SELECT * FROM (
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
) checks
WHERE is_invalid = true; 