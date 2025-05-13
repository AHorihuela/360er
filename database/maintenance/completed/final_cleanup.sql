-- Begin transaction for safety
BEGIN;

-- Log the final cleanup operation (using only version column)
INSERT INTO schema_migrations (version)
VALUES ('20240608000001');

-- Add a comment explaining the migration
COMMENT ON DATABASE postgres IS 'Migration 20240608000001: Final cleanup of renamed redundant tables after verification period';

-- Drop renamed views if they exist
DROP VIEW IF EXISTS to_remove_deprecated_review_cycles_feedback_summary;
DROP VIEW IF EXISTS to_remove_deprecated_review_cycles_with_feedback;
DROP VIEW IF EXISTS to_remove_deprecated_user_review_cycles;

-- Drop renamed deprecated tables if they exist
DROP TABLE IF EXISTS to_remove_deprecated_page_views;

-- Drop all renamed policy backup tables if they exist
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND (
            tablename LIKE 'to_remove_deprecated_policy_backup%' OR
            tablename LIKE 'to_remove_policy_backup%'
        )
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(table_name);
    END LOOP;
END
$$;

-- Drop the renamed backup table from previous migrations if it exists
DROP TABLE IF EXISTS to_remove_all_tables_backup_20240232;

-- Drop renamed feedback_analyses table if it exists
DROP TABLE IF EXISTS to_remove_feedback_analyses;

-- Add a comment to the backup table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'feedback_analyses_backup'
    ) THEN
        EXECUTE 'COMMENT ON TABLE feedback_analyses_backup IS ''Permanent backup of feedback_analyses table after final cleanup on 2024-06-08. This table can be safely removed after 3 months if no issues arise.''';
    END IF;
END
$$;

-- Also drop any original tables that might still be around
DROP TABLE IF EXISTS deprecated_page_views;
DROP VIEW IF EXISTS deprecated_review_cycles_feedback_summary;
DROP VIEW IF EXISTS deprecated_review_cycles_with_feedback;
DROP VIEW IF EXISTS deprecated_user_review_cycles;

-- Drop all original policy backup tables if they still exist
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

-- Commit the transaction
COMMIT; 