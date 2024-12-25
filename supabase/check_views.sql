-- Check for views and their definitions
SELECT 
    v.viewname,
    v.definition
FROM pg_views v
WHERE v.schemaname = 'public'; 