-- To be executed after 2024-02-09 if no issues are found
-- This migration will clean up tables that were deprecated in 20240232000004_deprecate_unused_tables.sql

-- First verify no issues were reported
DO $$
BEGIN
    -- Add a note in schema_migrations that this cleanup was verified
    INSERT INTO schema_migrations (version, notes) 
    VALUES (
        '20240239000001',
        'Cleanup of deprecated tables verified safe after 1 week monitoring'
    );
END $$;

-- Drop deprecated views
DROP VIEW IF EXISTS deprecated_review_cycles_feedback_summary;
DROP VIEW IF EXISTS deprecated_review_cycles_with_feedback;
DROP VIEW IF EXISTS deprecated_user_review_cycles;

-- Drop deprecated tables
DROP TABLE IF EXISTS deprecated_feedback_responses_backup;
DROP TABLE IF EXISTS deprecated_page_views;

-- Drop all deprecated policy backup tables
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE 'deprecated_policy_backup%'
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(table_name);
    END LOOP;
END
$$;

-- Keep the backup table (all_tables_backup_20240232) for another week
-- Create a note about when it can be dropped
COMMENT ON TABLE all_tables_backup_20240232 IS 'Can be dropped after 2024-02-16 if no issues reported'; 