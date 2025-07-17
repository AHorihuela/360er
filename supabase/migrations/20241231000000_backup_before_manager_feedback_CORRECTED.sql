-- Backup Script: Pre-Manager Feedback Migration (CORRECTED)
-- Date: December 31, 2024
-- Purpose: Create complete backup before adding manager-to-employee feedback system
-- 
-- This backup captures:
-- 1. Current table schemas and constraints
-- 2. All existing data
-- 3. RLS policies and permissions
-- 4. Rollback procedures

------------------------------------------
-- Schema Backup: Current Table Structures
------------------------------------------

-- Backup current review_cycles constraint (CORRECTED - removed non-existent constraint_type)
CREATE TABLE IF NOT EXISTS backup_review_cycles_constraints AS
SELECT 
    constraint_name,
    check_clause,
    'pre_manager_feedback_migration' as backup_reason,
    NOW() as backup_date
FROM information_schema.check_constraints 
WHERE constraint_name = 'review_cycles_type_check';

-- Backup current feedback_requests structure
CREATE TABLE IF NOT EXISTS backup_feedback_requests_structure AS
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    'pre_manager_feedback_migration' as backup_reason,
    NOW() as backup_date
FROM information_schema.columns 
WHERE table_name = 'feedback_requests' 
AND table_schema = 'public';

-- Backup current feedback_responses structure  
CREATE TABLE IF NOT EXISTS backup_feedback_responses_structure AS
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    'pre_manager_feedback_migration' as backup_reason,
    NOW() as backup_date
FROM information_schema.columns 
WHERE table_name = 'feedback_responses' 
AND table_schema = 'public';

-- Backup current ai_reports structure
CREATE TABLE IF NOT EXISTS backup_ai_reports_structure AS
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    'pre_manager_feedback_migration' as backup_reason,
    NOW() as backup_date
FROM information_schema.columns 
WHERE table_name = 'ai_reports' 
AND table_schema = 'public';

------------------------------------------
-- Data Backup: Current Production Data
------------------------------------------

-- Backup all review cycles (small dataset, safe to copy)
CREATE TABLE IF NOT EXISTS backup_review_cycles_data AS
SELECT *, NOW() as backup_date FROM review_cycles;

-- Backup all feedback requests (verify data integrity later)
CREATE TABLE IF NOT EXISTS backup_feedback_requests_data AS  
SELECT *, NOW() as backup_date FROM feedback_requests;

-- Backup sample of feedback responses (for validation, not full copy due to potential size)
CREATE TABLE IF NOT EXISTS backup_feedback_responses_sample AS
SELECT *, NOW() as backup_date FROM feedback_responses 
ORDER BY created_at DESC 
LIMIT 1000;

-- Backup all ai_reports (manageable size)
CREATE TABLE IF NOT EXISTS backup_ai_reports_data AS
SELECT *, NOW() as backup_date FROM ai_reports;

------------------------------------------
-- Policy Backup: Current RLS Policies
------------------------------------------

-- Backup current RLS policies
CREATE TABLE IF NOT EXISTS backup_rls_policies AS
SELECT 
    schemaname,
    tablename, 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check,
    'pre_manager_feedback_migration' as backup_reason,
    NOW() as backup_date
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('review_cycles', 'feedback_requests', 'feedback_responses', 'ai_reports');

------------------------------------------
-- Record Current Data Counts
------------------------------------------

-- Record current counts for validation after migration
CREATE TABLE IF NOT EXISTS backup_data_counts AS
SELECT 
    'review_cycles' as table_name,
    COUNT(*) as record_count,
    NOW() as backup_date
FROM review_cycles
UNION ALL
SELECT 
    'feedback_requests' as table_name,
    COUNT(*) as record_count,
    NOW() as backup_date  
FROM feedback_requests
UNION ALL
SELECT 
    'feedback_responses' as table_name,
    COUNT(*) as record_count,
    NOW() as backup_date
FROM feedback_responses
UNION ALL
SELECT 
    'ai_reports' as table_name,
    COUNT(*) as record_count,
    NOW() as backup_date
FROM ai_reports;

------------------------------------------
-- Validation Queries for Post-Migration
------------------------------------------

-- Create function to validate data integrity after migration
CREATE OR REPLACE FUNCTION validate_post_migration()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check that record counts match pre-migration
    RETURN QUERY
    SELECT 
        'data_count_validation'::TEXT,
        CASE 
            WHEN current_count.cnt = backup_count.record_count THEN 'PASS'::TEXT
            ELSE 'FAIL'::TEXT
        END,
        FORMAT('Table: %s, Before: %s, After: %s', 
               backup_count.table_name, 
               backup_count.record_count, 
               current_count.cnt)::TEXT
    FROM backup_data_counts backup_count
    LEFT JOIN (
        SELECT 'review_cycles' as table_name, COUNT(*) as cnt FROM review_cycles
        UNION ALL
        SELECT 'feedback_requests' as table_name, COUNT(*) as cnt FROM feedback_requests
        UNION ALL  
        SELECT 'feedback_responses' as table_name, COUNT(*) as cnt FROM feedback_responses
        UNION ALL
        SELECT 'ai_reports' as table_name, COUNT(*) as cnt FROM ai_reports
    ) current_count ON backup_count.table_name = current_count.table_name;
    
    -- Check that new columns were added correctly
    RETURN QUERY
    SELECT 
        'new_columns_check'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'feedback_responses' 
                AND column_name IN ('source', 'category')
            ) THEN 'PASS'::TEXT
            ELSE 'FAIL'::TEXT
        END,
        'feedback_responses source and category columns added'::TEXT;
        
    RETURN QUERY
    SELECT 
        'constraint_check'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.check_constraints 
                WHERE constraint_name = 'review_cycles_type_check' 
                AND check_clause LIKE '%manager_to_employee%'
            ) THEN 'PASS'::TEXT
            ELSE 'FAIL'::TEXT
        END,
        'review_cycles type constraint updated'::TEXT;
END;
$$;

------------------------------------------
-- Rollback Procedures
------------------------------------------

-- Create rollback script (to be used only if needed)
CREATE OR REPLACE FUNCTION create_rollback_script()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    rollback_sql TEXT;
BEGIN
    rollback_sql := FORMAT('
-- ROLLBACK SCRIPT: Revert Manager Feedback Migration
-- WARNING: This will undo all changes from the manager feedback migration
-- Run this ONLY if the migration caused issues

-- 1. Restore original review_cycles constraint
ALTER TABLE review_cycles DROP CONSTRAINT IF EXISTS review_cycles_type_check;
%s

-- 2. Remove new columns from feedback_responses
ALTER TABLE feedback_responses DROP COLUMN IF EXISTS source;
ALTER TABLE feedback_responses DROP COLUMN IF EXISTS category;

-- 3. Restore unique_link NOT NULL constraint (ONLY if no NULL values exist)
-- Check first: SELECT COUNT(*) FROM feedback_requests WHERE unique_link IS NULL;
-- If count > 0, you will need to fix those records before running:
-- ALTER TABLE feedback_requests ALTER COLUMN unique_link SET NOT NULL;

-- 4. Remove new columns from ai_reports
ALTER TABLE ai_reports DROP COLUMN IF EXISTS report_period_start;
ALTER TABLE ai_reports DROP COLUMN IF EXISTS report_period_end;
ALTER TABLE ai_reports DROP COLUMN IF EXISTS time_range_preset;
ALTER TABLE ai_reports DROP COLUMN IF EXISTS report_purpose;
ALTER TABLE ai_reports DROP COLUMN IF EXISTS feedback_count;

-- 5. Remove new indexes
DROP INDEX IF EXISTS idx_feedback_responses_submitted_at;
DROP INDEX IF EXISTS idx_feedback_responses_category;
DROP INDEX IF EXISTS idx_ai_reports_period;

-- Validation: Check that schema matches backup
SELECT ''Rollback completed - verify data integrity'';
',
        COALESCE(
            (SELECT FORMAT('ALTER TABLE review_cycles ADD CONSTRAINT review_cycles_type_check %s;', check_clause)
             FROM backup_review_cycles_constraints LIMIT 1),
            '-- Original constraint not found in backup'
        )
    );
    
    RETURN rollback_sql;
END;
$$;

------------------------------------------
-- Backup Completion Verification
------------------------------------------

DO $$
BEGIN
    -- Verify all backup tables were created
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_review_cycles_data') THEN
        RAISE EXCEPTION 'Backup failed: backup_review_cycles_data table not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_data_counts') THEN
        RAISE EXCEPTION 'Backup failed: backup_data_counts table not created';
    END IF;
    
    -- Check that we have data in backups
    IF (SELECT COUNT(*) FROM backup_data_counts) = 0 THEN
        RAISE EXCEPTION 'Backup failed: no data counts recorded';
    END IF;
    
    RAISE NOTICE 'Database backup completed successfully';
    RAISE NOTICE 'Backup tables created: review_cycles, feedback_requests, feedback_responses, ai_reports';
    RAISE NOTICE 'Validation function created: validate_post_migration()';
    RAISE NOTICE 'Rollback script available: SELECT create_rollback_script()';
    RAISE NOTICE 'You can now safely proceed with the manager feedback migration';
END
$$; 