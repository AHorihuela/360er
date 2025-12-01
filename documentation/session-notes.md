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
