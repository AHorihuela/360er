-- Check feedback requests
SELECT COUNT(*) as feedback_requests_count 
FROM feedback_requests;

-- Check feedback responses
SELECT COUNT(*) as feedback_responses_count 
FROM feedback_responses;

-- Check a sample of recent feedback
SELECT 
  fr.id as request_id,
  fr.status,
  fr.created_at,
  COUNT(fres.id) as responses_count
FROM feedback_requests fr
LEFT JOIN feedback_responses fres ON fr.id = fres.feedback_request_id
GROUP BY fr.id, fr.status, fr.created_at
ORDER BY fr.created_at DESC
LIMIT 5; 