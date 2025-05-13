-- Begin transaction for safety
BEGIN;

-- Create a backup of feedback_analyses table contents before dropping
-- This ensures we don't lose any data that might be unique to this table
CREATE TABLE IF NOT EXISTS feedback_analyses_backup_before_drop AS
SELECT * FROM feedback_analyses;

-- Log the cleanup operation
INSERT INTO schema_migrations (version, notes)
VALUES (
    '20240601000001',
    'Cleanup of redundant tables and views'
);

-- Drop deprecated views
DROP VIEW IF EXISTS deprecated_review_cycles_feedback_summary;
DROP VIEW IF EXISTS deprecated_review_cycles_with_feedback;
DROP VIEW IF EXISTS deprecated_user_review_cycles;

-- Drop deprecated tables
DROP TABLE IF EXISTS deprecated_page_views;

-- Drop all policy backup tables
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND (
            tablename LIKE 'deprecated_policy_backup%' OR
            tablename LIKE 'policy_backup%'
        )
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(table_name);
    END LOOP;
END
$$;

-- Drop the backup table from previous migrations
DROP TABLE IF EXISTS all_tables_backup_20240232;

-- Drop feedback_analyses table as it appears redundant with feedback_analytics
-- Only do this if we've confirmed data has been migrated or is redundant
DROP TABLE IF EXISTS feedback_analyses;

-- Commit the transaction
COMMIT;

-- Add a comment explaining what was done
COMMENT ON TABLE feedback_analyses_backup_before_drop IS 'Backup of feedback_analyses table before dropping it in cleanup_tables migration on 2024-06-01'; 