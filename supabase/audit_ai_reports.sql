-- Check current ai_reports table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'ai_reports'
ORDER BY ordinal_position;

-- Check existing constraints
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'ai_reports'::regclass;

-- Check existing reports with content
SELECT 
    id,
    feedback_request_id,
    status,
    is_final,
    CASE 
        WHEN content IS NULL THEN 'NULL'
        ELSE 'NOT NULL'
    END as content_status,
    created_at,
    updated_at
FROM ai_reports
ORDER BY created_at DESC
LIMIT 5;

-- Check for any reports referenced by feedback_requests
SELECT 
    fr.id as request_id,
    fr.status as request_status,
    ar.id as report_id,
    ar.status as report_status,
    ar.content IS NOT NULL as has_content
FROM feedback_requests fr
LEFT JOIN ai_reports ar ON ar.feedback_request_id = fr.id
WHERE ar.id IS NOT NULL
ORDER BY fr.created_at DESC
LIMIT 5;

-- Check for any reports that might be affected by the change
SELECT COUNT(*) as total_reports,
       COUNT(*) FILTER (WHERE content IS NULL) as null_content_reports,
       COUNT(*) FILTER (WHERE content IS NOT NULL) as filled_content_reports,
       COUNT(*) FILTER (WHERE status = 'processing') as processing_reports
FROM ai_reports;

-- Check for any potential data integrity issues
SELECT fr.id as request_id,
       fr.status as request_status,
       COUNT(ar.id) as report_count
FROM feedback_requests fr
LEFT JOIN ai_reports ar ON ar.feedback_request_id = fr.id
GROUP BY fr.id, fr.status
HAVING COUNT(ar.id) > 1
ORDER BY COUNT(ar.id) DESC
LIMIT 5; 