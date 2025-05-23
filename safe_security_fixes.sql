-- =============================================================================
-- SAFE SECURITY FIXES - INCREMENTAL APPROACH
-- =============================================================================
-- Run sections one at a time, test your app between each section
-- If something breaks, use security_rollback_plan.sql to revert

-- =============================================================================
-- PHASE 1: SAFEST FIX - Schema Migrations (Lowest Risk)
-- =============================================================================
-- Schema migrations table is least likely to break functionality

-- Enable RLS on schema_migrations
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

-- Create admin-only policy (most restrictive)
CREATE POLICY "schema_migrations_admin_only" ON public.schema_migrations
FOR ALL USING (auth.role() = 'service_role');

-- Test query - should return no rows for anon/authenticated
-- (Run this to verify it works - you should get "insufficient privilege" error as anon)
-- SELECT * FROM schema_migrations;

SELECT 'PHASE 1 COMPLETE - Test your application now!' as status;
SELECT 'If app still works, proceed to PHASE 2' as next_step;

-- =============================================================================
-- PHASE 2: MEDIUM RISK - Policy Tables
-- =============================================================================
-- ⚠️  ONLY RUN THIS IF PHASE 1 DIDN'T BREAK ANYTHING

-- Enable RLS on policy backup tables
-- ALTER TABLE public.policy_backups ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.policy_revert_scripts ENABLE ROW LEVEL SECURITY;

-- Create admin-only policies
-- CREATE POLICY "policy_backups_admin_only" ON public.policy_backups
-- FOR ALL USING (auth.role() = 'service_role');

-- CREATE POLICY "policy_revert_scripts_admin_only" ON public.policy_revert_scripts  
-- FOR ALL USING (auth.role() = 'service_role');

-- SELECT 'PHASE 2 COMPLETE - Test your application again!' as status;
-- SELECT 'If app still works, proceed to PHASE 3' as next_step;

-- =============================================================================
-- PHASE 3: HIGHEST RISK - Feedback Analyses Backup
-- =============================================================================
-- ⚠️  ONLY RUN THIS IF PHASES 1-2 DIDN'T BREAK ANYTHING
-- This table name suggests it might contain user feedback data

-- Enable RLS on feedback analyses backup
-- ALTER TABLE public.feedback_analyses_backup ENABLE ROW LEVEL SECURITY;

-- Create admin-only policy
-- CREATE POLICY "feedback_analyses_backup_admin_only" ON public.feedback_analyses_backup
-- FOR ALL USING (auth.role() = 'service_role');

-- SELECT 'PHASE 3 COMPLETE - Test your application thoroughly!' as status;
-- SELECT 'If everything works, proceed to PHASE 4' as next_step;

-- =============================================================================
-- PHASE 4: INVESTIGATE SECURITY DEFINER VIEW
-- =============================================================================
-- ⚠️  ONLY RUN THIS IF PHASES 1-3 WORK PERFECTLY

-- First, let's understand what this view does
-- SELECT 'employee_access_paths VIEW ANALYSIS' as info;
-- SELECT definition FROM pg_views WHERE viewname = 'employee_access_paths';

-- Check if app actually uses this view
-- SELECT 'employee_access_paths USAGE CHECK' as info;
-- SELECT * FROM employee_access_paths LIMIT 5;

-- If the view is unused or can be safely modified:
-- Option A: Drop the view if not needed
-- DROP VIEW IF EXISTS public.employee_access_paths;

-- Option B: Recreate without SECURITY DEFINER
-- (Would need to see the view definition first)

-- SELECT 'PHASE 4 COMPLETE - All security fixes applied!' as status;

-- =============================================================================
-- VERIFICATION QUERIES - Run after each phase
-- =============================================================================

-- Check what anonymous users can still access
SELECT 
    'CURRENT ANONYMOUS ACCESS' as check_type,
    table_name,
    COUNT(*) as permission_count
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND grantee = 'anon'
AND table_name IN ('schema_migrations', 'policy_backups', 'policy_revert_scripts', 'feedback_analyses_backup')
GROUP BY table_name
ORDER BY table_name;

-- Check RLS status
SELECT 
    'RLS STATUS' as check_type,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('schema_migrations', 'policy_backups', 'policy_revert_scripts', 'feedback_analyses_backup')
ORDER BY tablename; 