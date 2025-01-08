-- Create a backup of all tables we plan to deprecate
CREATE TABLE all_tables_backup_20240232 AS
SELECT 
    'review_cycles_feedback_summary' as source_table,
    row_to_json(v.*)::text as data 
FROM review_cycles_feedback_summary v
UNION ALL
SELECT 
    'review_cycles_with_feedback' as source_table,
    row_to_json(v.*)::text as data 
FROM review_cycles_with_feedback v
UNION ALL
SELECT 
    'user_review_cycles' as source_table,
    row_to_json(v.*)::text as data 
FROM user_review_cycles v
UNION ALL
SELECT 
    'feedback_responses_backup' as source_table,
    row_to_json(t.*)::text as data 
FROM feedback_responses_backup t
UNION ALL
SELECT 
    'page_views' as source_table,
    row_to_json(t.*)::text as data 
FROM page_views t;

-- Rename tables with deprecated_ prefix for safety
ALTER TABLE IF EXISTS review_cycles_feedback_summary 
    RENAME TO deprecated_review_cycles_feedback_summary;
    
ALTER TABLE IF EXISTS review_cycles_with_feedback 
    RENAME TO deprecated_review_cycles_with_feedback;
    
ALTER TABLE IF EXISTS user_review_cycles 
    RENAME TO deprecated_user_review_cycles;
    
ALTER TABLE IF EXISTS feedback_responses_backup 
    RENAME TO deprecated_feedback_responses_backup;
    
ALTER TABLE IF EXISTS page_views 
    RENAME TO deprecated_page_views;

-- Rename policy backup tables
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE 'policy_backup%'
    LOOP
        EXECUTE 'ALTER TABLE IF EXISTS ' || quote_ident(table_name) || 
                ' RENAME TO deprecated_' || quote_ident(table_name);
    END LOOP;
END
$$;

-- Note: These tables are marked for deletion after confirming no issues for 1 week
-- A follow-up migration will be created to actually drop these tables if no issues arise 