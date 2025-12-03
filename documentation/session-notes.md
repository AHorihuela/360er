# Session Notes

Technical learnings and known issues from development sessions. Read this when encountering database or testing issues.

## PostgREST Database Relationship Issues (Nov 2024)

**Problem:** PostgREST automatic join failures with "Could not find a relationship" errors

**Solution:** Manual data linking pattern - separate queries + JavaScript-based data joining

**Affected Areas:**
- Review cycles
- Employees
- Analytics
- Feedback forms

**Result:** All core functionality restored without database schema changes

**Pattern to follow:**
```javascript
// Instead of relying on PostgREST joins:
const { data } = await supabase.from('table').select('*, related_table(*)');

// Use separate queries and manual linking:
const { data: mainData } = await supabase.from('table').select('*');
const { data: relatedData } = await supabase.from('related_table').select('*');
const linked = mainData.map(item => ({
  ...item,
  related: relatedData.filter(r => r.foreign_key === item.id)
}));
```

## Critical Testing Gap

**Issue:** Unit tests mock Supabase completely, hiding real database relationship errors

**Implication:** Tests passing does NOT equal functionality working in real environment

**Validation Rule:** After implementing ANY fix:
1. Test manually first
2. Use Playwright agent for UI verification
3. Verify actual functionality works with real data

**Root Cause:** Playwright agent has authentication limitations for protected routes, and mocked tests don't catch real DB issues.

## Production Security Cleanup (Dec 2025)

**Issue:** 5 backup tables in production lacked RLS policies, exposing data publicly

**Tables Dropped:**
- `employees_backup_20251103` (150 rows)
- `reviewees_backup_20251103` (218 rows)
- `organizations_backup_20251103` (48 rows)
- `organization_members_backup_20251103` (36 rows)
- `feedback_requests_backup_20251103` (194 rows)

**Verification:** Data was duplicated in main tables or `*_deprecated_20251103` tables. 55 unique records (1 org member, 54 stale pending feedback requests) were intentionally deleted data.

**Migration:** `20251203_drop_orphaned_backup_tables`

**Lesson:** When creating backup tables, always enable RLS or move to a non-public schema.
