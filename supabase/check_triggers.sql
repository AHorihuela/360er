-- Check triggers on both tables
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as enabled,
    tgtype,
    tgfoid::regproc as function_name,
    CASE 
        WHEN tgtype & 1 = 1 THEN 'ROW'
        ELSE 'STATEMENT'
    END as level,
    CASE 
        WHEN tgtype & 2 = 2 THEN 'BEFORE'
        WHEN tgtype & 64 = 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END as timing,
    CASE 
        WHEN tgtype & 4 = 4 THEN 'INSERT'
        WHEN tgtype & 8 = 8 THEN 'DELETE'
        WHEN tgtype & 16 = 16 THEN 'UPDATE'
        WHEN tgtype & 32 = 32 THEN 'TRUNCATE'
    END as operation
FROM pg_trigger t
WHERE tgrelid::regclass::text IN ('feedback_requests', 'feedback_responses')
AND NOT tgisinternal;

-- Check trigger functions
SELECT 
    p.proname as function_name,
    p.prosrc as source_code
FROM pg_proc p
JOIN pg_trigger t ON t.tgfoid = p.oid
WHERE t.tgrelid::regclass::text IN ('feedback_requests', 'feedback_responses')
AND NOT t.tgisinternal; 