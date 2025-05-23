-- =============================================================================
-- SUPABASE DATABASE SECURITY AUDIT
-- =============================================================================
-- This script audits the security issues reported by Supabase linter
-- Run each section separately and review results

-- =============================================================================
-- 1. AUDIT: SECURITY DEFINER VIEW (employee_access_paths)
-- =============================================================================
SELECT 
    'SECURITY DEFINER VIEW AUDIT' as audit_type,
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname = 'employee_access_paths';

-- Check what this view actually does - get column details
SELECT 
    'VIEW COLUMN DETAILS' as audit_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'employee_access_paths'
ORDER BY ordinal_position;

-- Check who owns this view and what privileges it has
SELECT 
    'VIEW OWNERSHIP & PRIVILEGES' as audit_type,
    schemaname,
    viewname,
    viewowner,
    (SELECT rolname FROM pg_roles WHERE oid = (SELECT relowner FROM pg_class WHERE relname = 'employee_access_paths')) as owner_role
FROM pg_views 
WHERE viewname = 'employee_access_paths';

-- =============================================================================
-- 2. AUDIT: TABLES WITHOUT RLS
-- =============================================================================

-- Check all tables without RLS enabled in public schema
SELECT 
    'TABLES WITHOUT RLS' as audit_type,
    schemaname,
    tablename,
    tableowner,
    rowsecurity,
    (SELECT count(*) FROM information_schema.columns WHERE table_name = tablename AND table_schema = 'public') as column_count
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('schema_migrations', 'policy_backups', 'policy_revert_scripts', 'feedback_analyses_backup')
ORDER BY tablename;

-- =============================================================================
-- 3. DETAILED AUDIT: schema_migrations
-- =============================================================================
SELECT 'SCHEMA_MIGRATIONS AUDIT' as audit_type;

-- Check structure and data sensitivity
SELECT 
    'schema_migrations structure' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'schema_migrations'
ORDER BY ordinal_position;

-- Check if it contains sensitive data (sample first 5 rows if exists)
SELECT 'Sample data from schema_migrations:' as info;
SELECT * FROM public.schema_migrations LIMIT 5;

-- Check row count
SELECT 'schema_migrations' as table_name, count(*) as row_count FROM public.schema_migrations;

-- =============================================================================
-- 4. DETAILED AUDIT: policy_backups
-- =============================================================================
SELECT 'POLICY_BACKUPS AUDIT' as audit_type;

-- Check structure
SELECT 
    'policy_backups structure' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'policy_backups'
ORDER BY ordinal_position;

-- Check if it contains sensitive data (just structure, not data for security)
SELECT 
    'policy_backups' as table_name,
    count(*) as row_count,
    min(created_at) as oldest_backup,
    max(created_at) as newest_backup
FROM public.policy_backups
WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'policy_backups' AND column_name = 'created_at');

-- If no created_at column, just get row count
SELECT 
    'policy_backups' as table_name,
    count(*) as row_count
FROM public.policy_backups
WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'policy_backups' AND column_name = 'created_at');

-- =============================================================================
-- 5. DETAILED AUDIT: policy_revert_scripts  
-- =============================================================================
SELECT 'POLICY_REVERT_SCRIPTS AUDIT' as audit_type;

-- Check structure
SELECT 
    'policy_revert_scripts structure' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'policy_revert_scripts'
ORDER BY ordinal_position;

-- Check row count and basic info
SELECT 
    'policy_revert_scripts' as table_name,
    count(*) as row_count
FROM public.policy_revert_scripts;

-- =============================================================================
-- 6. DETAILED AUDIT: feedback_analyses_backup
-- =============================================================================
SELECT 'FEEDBACK_ANALYSES_BACKUP AUDIT' as audit_type;

-- Check structure
SELECT 
    'feedback_analyses_backup structure' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'feedback_analyses_backup'
ORDER BY ordinal_position;

-- Check if this contains sensitive user data
SELECT 
    'feedback_analyses_backup' as table_name,
    count(*) as row_count,
    count(DISTINCT employee_id) as unique_employees,
    min(created_at) as oldest_backup,
    max(created_at) as newest_backup
FROM public.feedback_analyses_backup
WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback_analyses_backup' AND column_name = 'employee_id')
AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback_analyses_backup' AND column_name = 'created_at');

-- Fallback if columns don't exist
SELECT 
    'feedback_analyses_backup' as table_name,
    count(*) as row_count
FROM public.feedback_analyses_backup
WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback_analyses_backup' AND column_name = 'employee_id')
OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback_analyses_backup' AND column_name = 'created_at');

-- =============================================================================
-- 7. OVERALL SECURITY POSTURE CHECK
-- =============================================================================

-- Check all public tables and their RLS status
SELECT 
    'ALL PUBLIC TABLES RLS STATUS' as audit_type,
    schemaname,
    tablename,
    tableowner,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'PROTECTED'
        ELSE 'EXPOSED'
    END as security_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY rowsecurity, tablename;

-- Check existing RLS policies for main tables
SELECT 
    'EXISTING RLS POLICIES' as audit_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================================================
-- 8. RISK ASSESSMENT QUERIES
-- =============================================================================

-- Check if problematic tables are accessible via PostgREST/API
SELECT 
    'API EXPOSURE CHECK' as audit_type,
    table_name,
    privilege_type,
    grantee,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name IN ('schema_migrations', 'policy_backups', 'policy_revert_scripts', 'feedback_analyses_backup')
AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY table_name, privilege_type;

-- Check for any functions that might be using SECURITY DEFINER
SELECT 
    'SECURITY DEFINER FUNCTIONS' as audit_type,
    routine_schema,
    routine_name,
    routine_type,
    security_type,
    definer_rights
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND security_type = 'DEFINER'
ORDER BY routine_name;

-- =============================================================================
-- SUMMARY AND RECOMMENDATIONS
-- =============================================================================
SELECT 'AUDIT COMPLETE - REVIEW RESULTS ABOVE' as status; 