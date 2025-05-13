# Database Maintenance

This directory contains scripts and documentation for database maintenance tasks.

## Directory Structure

- `completed/` - Contains scripts and documentation for completed maintenance tasks
  - June 2024 database cleanup (redundant tables removal)

## Best Practices

When performing database maintenance:

1. **Safety First**
   - Always use transactions
   - Create backups before destructive operations
   - Test changes thoroughly before applying to production

2. **Documentation**
   - Document all maintenance tasks with dates and descriptions
   - Keep scripts for reference even after completion
   - Log operations in the `schema_migrations` table

3. **Process**
   - For schema changes, use a multi-phase approach:
     1. Add new structures
     2. Migrate data
     3. Test thoroughly
     4. Remove old structures
   - For cleanup operations, use a rename-test-remove approach

## Adding New Maintenance Scripts

When adding new maintenance scripts:

1. Create a descriptive directory under `maintenance/` for ongoing tasks
2. Move completed tasks to `completed/` with documentation
3. Follow the naming convention: `[sequence]_[action]_[target].sql`
