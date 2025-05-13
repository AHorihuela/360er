/*
 * Database Maintenance: Rename Redundant Tables (Step 1 of 2)
 * =========================================================
 * 
 * Date executed: June 2024
 * Purpose: Safely rename potentially redundant tables before removal
 * 
 * This script renames tables that appear to be redundant or deprecated
 * by prefixing them with "to_remove_". This allows for testing the application
 * with these tables renamed before permanently removing them.
 * 
 * Tables affected:
 * - Deprecated views (review_cycles_feedback_summary, etc.)
 * - Policy backup tables
 * - feedback_analyses (potentially redundant with feedback_analytics)
 * - all_tables_backup_20240232
 * 
 * After running this script, the application should be thoroughly tested
 * to ensure no functionality is broken by the renamed tables.
 */

-- Begin transaction for safety
BEGIN;

-- Log the rename operation (using only version column)
INSERT INTO schema_migrations (version)
VALUES ('20240601000001');

-- Add a comment explaining the migration
COMMENT ON DATABASE postgres IS 'Migration 20240601000001: Renamed potentially redundant tables for testing before removal';

-- Rename deprecated views instead of dropping them
ALTER VIEW IF EXISTS deprecated_review_cycles_feedback_summary 
    RENAME TO to_remove_deprecated_review_cycles_feedback_summary;
    
ALTER VIEW IF EXISTS deprecated_review_cycles_with_feedback 
    RENAME TO to_remove_deprecated_review_cycles_with_feedback;
    
ALTER VIEW IF EXISTS deprecated_user_review_cycles 
    RENAME TO to_remove_deprecated_user_review_cycles;

-- Rename deprecated tables instead of dropping
ALTER TABLE IF EXISTS deprecated_page_views 
    RENAME TO to_remove_deprecated_page_views;

-- Rename all policy backup tables with safety checks
DO $$
DECLARE
    table_name text;
    target_name text;
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
        target_name := 'to_remove_' || table_name;
        
        -- Check if the target table already exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' AND tablename = target_name
        ) THEN
            -- Only rename if the source table exists and target doesn't
            EXECUTE 'ALTER TABLE IF EXISTS public.' || quote_ident(table_name) || 
                    ' RENAME TO ' || quote_ident(target_name);
        END IF;
    END LOOP;
END
$$;

-- Rename the backup table from previous migrations
ALTER TABLE IF EXISTS all_tables_backup_20240232 
    RENAME TO to_remove_all_tables_backup_20240232;

-- Rename feedback_analyses table as it appears redundant with feedback_analytics
-- We'll keep a copy of the data just in case
CREATE TABLE IF NOT EXISTS feedback_analyses_backup AS
SELECT * FROM feedback_analyses;

-- Only rename if the target table doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'feedback_analyses')
       AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'to_remove_feedback_analyses')
    THEN
        ALTER TABLE feedback_analyses RENAME TO to_remove_feedback_analyses;
    END IF;
END
$$;

-- Commit the transaction
COMMIT;

-- Add a comment explaining what was done
COMMENT ON TABLE feedback_analyses_backup IS 'Backup of feedback_analyses table before renaming it in rename_before_cleanup migration on 2024-06-01';

-- Instructions for verification:
/*
After running this script:
1. Test all application functionality thoroughly
2. If everything works correctly for at least a week, run the final_cleanup.sql script to permanently remove the tables
3. If any issues are found, run the rollback.sql script to restore the renamed tables
*/ 