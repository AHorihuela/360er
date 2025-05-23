-- =============================================================================
-- SECURITY BACKUP PLAN - Run BEFORE making any changes
-- =============================================================================
-- This script backs up current permissions and table states for safe rollback

-- =============================================================================
-- 1. CREATE BACKUP SCHEMA
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS security_backup;

-- =============================================================================
-- 2. BACKUP CURRENT RLS STATUS
-- =============================================================================
CREATE TABLE security_backup.table_rls_backup AS
SELECT 
    schemaname,
    tablename,
    tableowner,
    rowsecurity as original_rls_enabled,
    NOW() as backup_timestamp
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('schema_migrations', 'policy_backups', 'policy_revert_scripts', 'feedback_analyses_backup');

-- =============================================================================
-- 3. BACKUP CURRENT POLICIES
-- =============================================================================
CREATE TABLE security_backup.policies_backup AS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check,
    NOW() as backup_timestamp
FROM pg_policies 
WHERE schemaname = 'public';

-- =============================================================================
-- 4. BACKUP CURRENT PERMISSIONS
-- =============================================================================
CREATE TABLE security_backup.permissions_backup AS
SELECT 
    table_schema,
    table_name,
    privilege_type,
    grantee,
    is_grantable,
    NOW() as backup_timestamp
FROM information_schema.table_privileges 
WHERE table_schema = 'public';

-- =============================================================================
-- 5. BACKUP VIEW DEFINITION
-- =============================================================================
CREATE TABLE security_backup.views_backup AS
SELECT 
    schemaname,
    viewname,
    viewowner,
    definition,
    NOW() as backup_timestamp
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname = 'employee_access_paths';

-- =============================================================================
-- 6. BACKUP FUNCTIONS (SECURITY DEFINER)
-- =============================================================================
CREATE TABLE security_backup.functions_backup AS
SELECT 
    routine_schema,
    routine_name,
    routine_type,
    security_type,
    routine_definition,
    NOW() as backup_timestamp
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND security_type = 'DEFINER';

-- =============================================================================
-- 7. BACKUP TABLE DATA (SMALL TABLES ONLY)
-- =============================================================================

-- Backup schema_migrations (only 3 rows)
CREATE TABLE security_backup.schema_migrations_data AS
SELECT *, NOW() as backup_timestamp FROM public.schema_migrations;

-- Backup policy_revert_scripts (only 1 row)  
CREATE TABLE security_backup.policy_revert_scripts_data AS
SELECT *, NOW() as backup_timestamp FROM public.policy_revert_scripts;

-- NOTE: Not backing up policy_backups or feedback_analyses_backup data 
-- as we don't know their size - we'll just preserve structure

-- =============================================================================
-- 8. CREATE BACKUP VERIFICATION
-- =============================================================================
SELECT 
    'BACKUP VERIFICATION' as check_type,
    'table_rls_backup' as backup_table,
    COUNT(*) as rows_backed_up
FROM security_backup.table_rls_backup
UNION ALL
SELECT 
    'BACKUP VERIFICATION' as check_type,
    'policies_backup' as backup_table,
    COUNT(*) as rows_backed_up
FROM security_backup.policies_backup
UNION ALL
SELECT 
    'BACKUP VERIFICATION' as check_type,
    'permissions_backup' as backup_table,
    COUNT(*) as rows_backed_up
FROM security_backup.permissions_backup
UNION ALL
SELECT 
    'BACKUP VERIFICATION' as check_type,
    'views_backup' as backup_table,
    COUNT(*) as rows_backed_up
FROM security_backup.views_backup
UNION ALL
SELECT 
    'BACKUP VERIFICATION' as check_type,
    'functions_backup' as backup_table,
    COUNT(*) as rows_backed_up
FROM security_backup.functions_backup;

SELECT 'BACKUP COMPLETE - Safe to proceed with security fixes' as status; 