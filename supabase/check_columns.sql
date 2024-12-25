-- Check columns in ai_reports table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ai_reports'
AND table_schema = 'public'
ORDER BY ordinal_position; 