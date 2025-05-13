/*
 * Database Maintenance: Rollback Renamed Tables (Safety Script)
 * =========================================================
 * 
 * Date: June 2024
 * Purpose: Rollback the renaming of tables if any issues are found
 * 
 * This script restores the original names of tables that were renamed
 * in the 1_rename_before_cleanup.sql script. It should only be run if
 * application issues are discovered after the rename operation.
 * 
 * Tables affected:
 * - Deprecated views (review_cycles_feedback_summary, etc.)
 * - Policy backup tables
 * - feedback_analyses (potentially redundant with feedback_analytics)
 * - all_tables_backup_20240232
 */

-- Begin transaction for safety
BEGIN;

-- Log the rollback operation (using only version column)
INSERT INTO schema_migrations (version)
VALUES ('20240601000002');

-- Add a comment explaining the migration
COMMENT ON DATABASE postgres IS 'Migration 20240601000002: Rolled back rename of potentially redundant tables due to issues';

-- Restore renamed views with safety checks
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'to_remove_deprecated_review_cycles_feedback_summary')
       AND NOT EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'deprecated_review_cycles_feedback_summary')
    THEN
        ALTER VIEW to_remove_deprecated_review_cycles_feedback_summary 
            RENAME TO deprecated_review_cycles_feedback_summary;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'to_remove_deprecated_review_cycles_with_feedback')
       AND NOT EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'deprecated_review_cycles_with_feedback')
    THEN
        ALTER VIEW to_remove_deprecated_review_cycles_with_feedback 
            RENAME TO deprecated_review_cycles_with_feedback;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'to_remove_deprecated_user_review_cycles')
       AND NOT EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'deprecated_user_review_cycles')
    THEN
        ALTER VIEW to_remove_deprecated_user_review_cycles 
            RENAME TO deprecated_user_review_cycles;
    END IF;
END
$$;

-- Restore deprecated tables with safety checks
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'to_remove_deprecated_page_views')
       AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'deprecated_page_views')
    THEN
        ALTER TABLE to_remove_deprecated_page_views 
            RENAME TO deprecated_page_views;
    END IF;
END
$$;

-- Restore all policy backup tables with safety checks
DO $$
DECLARE
    table_name text;
    original_name text;
BEGIN
    -- Handle to_remove_deprecated_policy_backup* tables
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE 'to_remove_deprecated_policy_backup%'
    LOOP
        original_name := substring(table_name from 11);
        
        -- Check if the original table doesn't exist yet
        IF NOT EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' AND tablename = original_name
        ) THEN
            EXECUTE 'ALTER TABLE IF EXISTS public.' || quote_ident(table_name) || 
                    ' RENAME TO ' || quote_ident(original_name);
        END IF;
    END LOOP;
    
    -- Handle to_remove_policy_backup* tables
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE 'to_remove_policy_backup%'
    LOOP
        original_name := substring(table_name from 11);
        
        -- Check if the original table doesn't exist yet
        IF NOT EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' AND tablename = original_name
        ) THEN
            EXECUTE 'ALTER TABLE IF EXISTS public.' || quote_ident(table_name) || 
                    ' RENAME TO ' || quote_ident(original_name);
        END IF;
    END LOOP;
END
$$;

-- Restore the backup table from previous migrations with safety check
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'to_remove_all_tables_backup_20240232')
       AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'all_tables_backup_20240232')
    THEN
        ALTER TABLE to_remove_all_tables_backup_20240232 
            RENAME TO all_tables_backup_20240232;
    END IF;
END
$$;

-- Restore feedback_analyses table with safety check
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'to_remove_feedback_analyses')
       AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'feedback_analyses')
    THEN
        ALTER TABLE to_remove_feedback_analyses 
            RENAME TO feedback_analyses;
    END IF;
END
$$;

-- Commit the transaction
COMMIT;

-- Add a comment explaining what was done
COMMENT ON TABLE feedback_analyses IS 'Restored table after rollback of rename operation on 2024-06-01'; 