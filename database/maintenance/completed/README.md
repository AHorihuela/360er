# Database Maintenance Scripts

This directory contains scripts for maintaining the Squad360 database, particularly for cleaning up redundant tables and ensuring database health.

## Table Cleanup Scripts (June 2024)

The following scripts are designed to safely clean up redundant tables in the database:

1. `1_rename_before_cleanup.sql` - Renames potentially redundant tables with a `to_remove_` prefix
2. `2_rollback.sql` - Restores original table names if issues are found after renaming
3. `3_final_cleanup.sql` - Permanently removes renamed tables after successful testing

### Cleanup Process

Follow this process to safely clean up redundant tables:

1. **Step 1: Rename Tables**
   - Run `1_rename_before_cleanup.sql` to rename potentially redundant tables
   - This script adds a `to_remove_` prefix to tables that appear to be unused
   - It creates a backup of `feedback_analyses` table data before renaming

2. **Step 2: Test Application**
   - Thoroughly test all application functionality for at least one week
   - Verify that no errors occur and all features work correctly
   - Monitor logs for any database-related errors

3. **Step 3A: If Issues Found**
   - If any problems are discovered, run `2_rollback.sql` to restore original table names
   - Investigate the issues and determine which tables are actually needed

3. **Step 3B: If No Issues Found**
   - After successful testing period, run `3_final_cleanup.sql` to permanently remove the renamed tables
   - This script will drop all tables with the `to_remove_` prefix

### Tables Affected

The cleanup targets the following tables:

- Deprecated views (`deprecated_review_cycles_feedback_summary`, etc.)
- Policy backup tables (`policy_backup_*`, `deprecated_policy_backup_*`)
- Backup tables (`all_tables_backup_20240232`)
- Potentially redundant analytics tables (`feedback_analyses` vs `feedback_analytics`)

### Safety Measures

These scripts include several safety measures:

- All operations are wrapped in transactions
- Each step is logged in the `schema_migrations` table
- A backup of `feedback_analyses` data is created before renaming
- Safety checks ensure tables exist before attempting operations
- Proper comments are added to document changes

## Running the Scripts

To run these scripts:

1. Connect to the Supabase database using psql or the Supabase dashboard SQL editor
2. Run the scripts in sequence, following the process above
3. Monitor application logs after each step

## Notes

- The `feedback_analyses_backup` table is preserved even after cleanup as a safety measure
- It can be safely removed after 3 months if no issues arise
- All script executions are logged in the `schema_migrations` table 