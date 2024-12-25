-- Check the view definition
SELECT 
    a.attname as column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class r ON r.oid = a.attrelid
JOIN pg_catalog.pg_namespace n ON n.oid = r.relnamespace
WHERE r.relname = 'review_cycles_with_feedback'
    AND n.nspname = 'public'
    AND a.attnum > 0
    AND NOT a.attisdropped
ORDER BY a.attnum; 