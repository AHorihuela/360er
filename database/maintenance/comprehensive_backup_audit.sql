-- =============================================================================
-- COMPREHENSIVE BACKUP AUDIT - Check all backup tables and processes
-- =============================================================================

-- 1. Find ALL tables with 'backup' in the name
SELECT 
    'ALL BACKUP TABLES' as audit_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    tableowner,
    CASE 
        WHEN rowsecurity = true THEN '✅ SECURED'
        ELSE '❌ VULNERABLE'
    END as security_status
FROM pg_tables 
WHERE tablename LIKE '%backup%' 
OR tablename LIKE '%_bak' 
OR tablename LIKE 'bak_%'
ORDER BY schemaname, tablename;

-- 2. Check our security_backup schema protection
SELECT 
    'SECURITY_BACKUP SCHEMA' as audit_type,
    schemaname,
    tablename,
    tableowner,
    'Our backup schema tables' as note
FROM pg_tables 
WHERE schemaname = 'security_backup'
ORDER BY tablename;

-- 3. Check permissions on security_backup schema
SELECT 
    'SECURITY_BACKUP PERMISSIONS' as audit_type,
    table_name,
    privilege_type,
    grantee,
    CASE 
        WHEN grantee IN ('anon', 'authenticated') THEN '⚠️ PUBLIC ACCESS'
        ELSE '✅ RESTRICTED'
    END as permission_status
FROM information_schema.table_privileges 
WHERE table_schema = 'security_backup'
ORDER BY table_name, grantee;

-- 4. Find any policy backup tables we might have missed
SELECT 
    'POLICY BACKUP VARIANTS' as audit_type,
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity = true THEN '✅ SECURED'
        ELSE '❌ VULNERABLE'  
    END as security_status
FROM pg_tables 
WHERE tablename LIKE 'policy%backup%' 
OR tablename LIKE '%policy%'
ORDER BY tablename;

-- 5. Check for any migration/schema backup tables
SELECT 
    'SCHEMA/MIGRATION BACKUPS' as audit_type,
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity = true THEN '✅ SECURED'
        ELSE '❌ VULNERABLE'
    END as security_status
FROM pg_tables 
WHERE tablename LIKE '%schema%' 
OR tablename LIKE '%migration%'
OR tablename LIKE '%version%'
ORDER BY tablename;

-- 6. Check for any feedback/analytics backup tables
SELECT 
    'FEEDBACK/ANALYTICS BACKUPS' as audit_type,
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity = true THEN '✅ SECURED'
        ELSE '❌ VULNERABLE'
    END as security_status
FROM pg_tables 
WHERE tablename LIKE '%feedback%backup%' 
OR tablename LIKE '%analytics%backup%'
OR tablename LIKE '%response%backup%'
ORDER BY tablename;

-- 7. Check anonymous access to ALL backup-related tables
SELECT 
    'ANONYMOUS ACCESS TO BACKUPS' as audit_type,
    table_name,
    COUNT(*) as permission_count,
    string_agg(privilege_type, ', ') as permissions,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO ANONYMOUS ACCESS'
        ELSE '❌ ANONYMOUS ACCESS EXISTS'
    END as security_status
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND grantee = 'anon'
AND (table_name LIKE '%backup%' 
     OR table_name LIKE '%_bak' 
     OR table_name LIKE 'bak_%'
     OR table_name LIKE '%migration%'
     OR table_name LIKE '%schema%'
     OR table_name LIKE '%policy%')
GROUP BY table_name
ORDER BY table_name;

-- 8. Summary of backup security status
SELECT 
    'BACKUP SECURITY SUMMARY' as summary,
    COUNT(*) as total_backup_tables,
    SUM(CASE WHEN rowsecurity = true THEN 1 ELSE 0 END) as secured_tables,
    SUM(CASE WHEN rowsecurity = false THEN 1 ELSE 0 END) as vulnerable_tables
FROM pg_tables 
WHERE schemaname = 'public'
AND (tablename LIKE '%backup%' 
     OR tablename LIKE '%_bak' 
     OR tablename LIKE 'bak_%'
     OR tablename LIKE '%migration%'
     OR tablename LIKE '%schema%'
     OR tablename LIKE '%policy%'); 