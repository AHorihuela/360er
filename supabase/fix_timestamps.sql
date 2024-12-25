-- First, let's check the problematic records
WITH problematic_requests AS (
    SELECT 
        fr.id as request_id,
        fr.created_at as request_created,
        rc.created_at as cycle_created,
        rc.id as cycle_id
    FROM feedback_requests fr
    JOIN review_cycles rc ON rc.id = fr.review_cycle_id
    WHERE fr.created_at < rc.created_at
)
SELECT * FROM problematic_requests;

-- Now update the timestamps to match the review cycle created_at
UPDATE feedback_requests
SET 
    created_at = rc.created_at,
    updated_at = GREATEST(updated_at, rc.created_at)
FROM review_cycles rc
WHERE rc.id = feedback_requests.review_cycle_id
AND feedback_requests.created_at < rc.created_at;

-- Update ai_reports timestamps if needed
UPDATE ai_reports
SET 
    created_at = fr.created_at,
    updated_at = GREATEST(updated_at, fr.created_at)
FROM feedback_requests fr
WHERE fr.id = ai_reports.feedback_request_id
AND ai_reports.created_at < fr.created_at;

-- Update feedback_responses timestamps if needed
UPDATE feedback_responses
SET 
    created_at = fr.created_at,
    updated_at = GREATEST(updated_at, fr.created_at)
FROM feedback_requests fr
WHERE fr.id = feedback_responses.feedback_request_id
AND feedback_responses.created_at < fr.created_at; 