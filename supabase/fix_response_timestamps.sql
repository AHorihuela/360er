-- Update feedback_responses timestamps to be at least equal to their request's created_at
WITH response_updates AS (
    SELECT 
        fres.id as response_id,
        fr.created_at as new_created_at,
        GREATEST(fr.created_at, fres.submitted_at) as new_submitted_at
    FROM feedback_responses fres
    JOIN feedback_requests fr ON fr.id = fres.feedback_request_id
    WHERE fres.created_at < fr.created_at
)
UPDATE feedback_responses
SET 
    created_at = ru.new_created_at,
    submitted_at = ru.new_submitted_at
FROM response_updates ru
WHERE feedback_responses.id = ru.response_id;

-- Verify the fix
SELECT 
    fres.id as response_id,
    fres.created_at as response_created,
    fr.created_at as request_created,
    fr.id as request_id,
    fres.created_at < fr.created_at as is_invalid
FROM feedback_responses fres
JOIN feedback_requests fr ON fr.id = fres.feedback_request_id
WHERE fres.created_at < fr.created_at; 