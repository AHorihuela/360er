-- =============================================================================
-- SECURITY CLEANUP - Revoke Underlying Grants (Optional)
-- =============================================================================
-- RLS policies already protect these tables, but this removes confusing grants

-- Revoke all permissions from anon and authenticated users
-- (RLS policies already block access, but this makes it cleaner)

-- 1. Revoke from feedback_analyses_backup
REVOKE ALL ON public.feedback_analyses_backup FROM anon;
REVOKE ALL ON public.feedback_analyses_backup FROM authenticated;

-- 2. Revoke from policy_backups  
REVOKE ALL ON public.policy_backups FROM anon;
REVOKE ALL ON public.policy_backups FROM authenticated;

-- 3. Revoke from policy_revert_scripts
REVOKE ALL ON public.policy_revert_scripts FROM anon;
REVOKE ALL ON public.policy_revert_scripts FROM authenticated;

-- 4. Revoke from schema_migrations
REVOKE ALL ON public.schema_migrations FROM anon;
REVOKE ALL ON public.schema_migrations FROM authenticated;

-- 5. Verify the cleanup
SELECT 
    'GRANT CLEANUP VERIFICATION' as check_type,
    table_name,
    COUNT(*) as remaining_permissions,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO ANONYMOUS GRANTS'
        ELSE '⚠️ GRANTS STILL EXIST'
    END as cleanup_status
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND grantee IN ('anon', 'authenticated')
AND table_name IN ('feedback_analyses_backup', 'policy_backups', 'policy_revert_scripts', 'schema_migrations')
GROUP BY table_name
ORDER BY table_name;

-- 6. Test that RLS policies still work (should return 0 rows for non-admin)
SELECT 'RLS POLICY TEST' as test_type, COUNT(*) as accessible_rows
FROM schema_migrations;

SELECT 'GRANT CLEANUP COMPLETE' as status; 