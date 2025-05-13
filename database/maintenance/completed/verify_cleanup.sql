/*
 * Database Maintenance: Verify Cleanup
 * =========================================================
 * 
 * Date: June 2024
 * Purpose: Verify that all redundant tables have been properly removed
 * 
 * This script checks if any tables that were targeted for removal still exist.
 * It can be run after 3_final_cleanup.sql to confirm the cleanup was successful.
 */

-- Check for any remaining tables with to_remove_ prefix
SELECT 
    table_name,
    table_type
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
    AND table_name LIKE 'to_remove_%';

-- Check for any remaining deprecated tables/views
SELECT 
    table_name,
    table_type
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
    AND (
        table_name LIKE 'deprecated_%' OR
        table_name LIKE '%_backup_%' OR
        table_name LIKE 'policy_backup%'
    );

-- Check if feedback_analyses still exists (should be renamed or dropped)
SELECT 
    table_name,
    table_type
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
    AND table_name = 'feedback_analyses';

-- Verify that feedback_analyses_backup exists (should be preserved)
SELECT 
    table_name,
    table_type
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
    AND table_name = 'feedback_analyses_backup';

-- Check schema_migrations for our maintenance entries
SELECT 
    version,
    applied_at
FROM 
    schema_migrations
WHERE 
    version IN ('20240601000001', '20240601000002', '20240608000001')
ORDER BY 
    applied_at; 