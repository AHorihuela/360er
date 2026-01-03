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

## Local Supabase Development (Jan 2026)

**Setup:** Local Supabase via Docker replaces remote testing database.

**Benefits:**
- Integration tests run against real local database, catching PostgREST issues
- No risk of accidentally modifying production data during development
- Faster iteration (no network latency)
- Works offline

**Workflow:**
```bash
npm run supabase:start   # Start local Supabase
npm run supabase:reset   # Reset and re-seed with test data
npm run test:integration # Run tests against local DB
npm run supabase:stop    # Stop when done
```

**Environment files:**
- `.env.local` - Points to local Supabase (127.0.0.1:54321)
- `.env.production.local` - Points to production Supabase

**Test data:** `supabase/seed.sql` creates realistic mock data including employees, review cycles, feedback requests/responses, and AI reports.

## Testing Gap (Resolved)

**Previous Issue:** Unit tests mocked Supabase completely, hiding real database relationship errors.

**Current Solution:** Two-tier testing approach:
1. `npm run test:unit` - Fast mocked tests for logic validation
2. `npm run test:integration` - Real database tests against local Supabase

**Validation Rule:** After implementing ANY fix:
1. Run integration tests with local Supabase
2. Test manually for UI verification
3. Verify actual functionality works with real data

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
