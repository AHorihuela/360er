-- =============================================================================
-- SECURITY ROLLBACK PLAN - EMERGENCY REVERT
-- =============================================================================
-- ⚠️  ONLY run this if security fixes break your application
-- This will restore the original (insecure) state

-- =============================================================================
-- 1. VERIFY BACKUP EXISTS
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'security_backup') THEN
        RAISE EXCEPTION 'No security backup found! Cannot proceed with rollback.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'security_backup' AND table_name = 'table_rls_backup') THEN
        RAISE EXCEPTION 'RLS backup table not found! Cannot proceed with rollback.';
    END IF;
    
    RAISE NOTICE 'Backup verified. Proceeding with rollback...';
END $$;

-- =============================================================================
-- 2. DISABLE RLS ON ALL TABLES (BACK TO ORIGINAL STATE)
-- =============================================================================

-- Get the list of tables that originally had RLS disabled and disable them
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM security_backup.table_rls_backup 
        WHERE original_rls_enabled = false
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', table_record.tablename);
        RAISE NOTICE 'Disabled RLS on table: %', table_record.tablename;
    END LOOP;
END $$;

-- =============================================================================
-- 3. DROP ALL NEW POLICIES (CREATED BY SECURITY FIXES)
-- =============================================================================

-- Drop policies that didn't exist in the original backup
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies pp
        WHERE pp.schemaname = 'public'
        AND pp.tablename IN ('schema_migrations', 'policy_backups', 'policy_revert_scripts', 'feedback_analyses_backup')
        AND NOT EXISTS (
            SELECT 1 FROM security_backup.policies_backup pb
            WHERE pb.tablename = pp.tablename 
            AND pb.policyname = pp.policyname
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 
                      policy_record.schemaname, 
                      policy_record.tablename);
        RAISE NOTICE 'Dropped policy: % on table %', policy_record.policyname, policy_record.tablename;
    END LOOP;
END $$;

-- =============================================================================
-- 4. RESTORE ORIGINAL PERMISSIONS
-- =============================================================================

-- Grant back the original permissions to anon/authenticated users
-- (This restores the insecure state but ensures functionality)

DO $$
DECLARE
    perm_record RECORD;
BEGIN
    FOR perm_record IN 
        SELECT table_name, privilege_type, grantee
        FROM security_backup.permissions_backup 
        WHERE table_schema = 'public'
        AND table_name IN ('schema_migrations', 'policy_backups', 'policy_revert_scripts', 'feedback_analyses_backup')
        AND grantee IN ('anon', 'authenticated', 'service_role')
    LOOP
        BEGIN
            EXECUTE format('GRANT %s ON public.%I TO %I', 
                          perm_record.privilege_type, 
                          perm_record.table_name, 
                          perm_record.grantee);
            RAISE NOTICE 'Granted % on % to %', perm_record.privilege_type, perm_record.table_name, perm_record.grantee;
        EXCEPTION 
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not grant % on % to % (may already exist)', perm_record.privilege_type, perm_record.table_name, perm_record.grantee;
        END;
    END LOOP;
END $$;

-- =============================================================================
-- 5. RESTORE DATA (IF NEEDED)
-- =============================================================================

-- Only restore small tables that we backed up
-- (Skip this if the data wasn't corrupted, only permissions changed)

-- Uncomment these if you need to restore table data:
/*
-- Restore schema_migrations
TRUNCATE public.schema_migrations;
INSERT INTO public.schema_migrations 
SELECT id, version FROM security_backup.schema_migrations_data;

-- Restore policy_revert_scripts  
TRUNCATE public.policy_revert_scripts;
INSERT INTO public.policy_revert_scripts 
SELECT id, created_at, policy_name, revert_script FROM security_backup.policy_revert_scripts_data;
*/

-- =============================================================================
-- 6. VERIFICATION - CHECK ROLLBACK SUCCESS
-- =============================================================================

-- Verify RLS is disabled on the problematic tables
SELECT 
    'ROLLBACK VERIFICATION' as check_type,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity = false THEN '✅ RLS DISABLED (ORIGINAL STATE)'
        ELSE '❌ RLS STILL ENABLED'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('schema_migrations', 'policy_backups', 'policy_revert_scripts', 'feedback_analyses_backup')
ORDER BY tablename;

-- Check permissions are restored
SELECT 
    'PERMISSION VERIFICATION' as check_type,
    table_name,
    COUNT(*) as permissions_count,
    string_agg(DISTINCT grantee, ', ') as grantees
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name IN ('schema_migrations', 'policy_backups', 'policy_revert_scripts', 'feedback_analyses_backup')
AND grantee IN ('anon', 'authenticated')
GROUP BY table_name
ORDER BY table_name;

-- =============================================================================
-- 7. CLEANUP WARNING
-- =============================================================================

SELECT 'ROLLBACK COMPLETE' as status;
SELECT '⚠️  WARNING: Your database is now back to the INSECURE state!' as security_warning;
SELECT 'Anonymous users can again access backup tables!' as critical_warning;
SELECT 'You should re-plan and re-apply security fixes when ready.' as next_steps; 