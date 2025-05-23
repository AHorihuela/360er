# Master Mode Race Condition Fix

## Problem Description

The user reported that sometimes when navigating to `/dashboard`, the UI would "forget" that Master Mode was toggled on. Specifically:

1. The "Master View" note showing "Review cycle created by..." would not appear unless the page was refreshed
2. The dropdown list would only show the user's own reviews instead of all accounts' reviews
3. The issue occurred intermittently, suggesting a race condition

## Root Cause Analysis

After analyzing the console logs and codebase, the issue was identified as a **race condition between multiple `useEffect` hooks** in several components:

### The Race Condition Pattern

1. **Multiple useEffect hooks watching the same state variables:**
   - `useDashboardData.ts` had two separate `useEffect` hooks both calling `fetchData()`
   - One watched `[isUserLoaded, viewingAllAccounts, user?.id]` 
   - Another watched `[viewingAllAccounts, isMasterAccount, user?.id]`

2. **Timing issue during auth initialization:**
   - When Master Mode was toggled, `viewingAllAccounts` would change first
   - The first useEffect would fire and fetch data **before** `isMasterAccount` was updated
   - Then `isMasterAccount` would get updated via `checkMasterAccountStatus` in `ProtectedRoute`
   - The second useEffect would fire with correct master status
   - But sometimes the first useEffect would fire again, reverting to filtered state

3. **State synchronization delays:**
   - Master account status check was asynchronous
   - Components were rendering and fetching data before the master status was confirmed
   - localStorage state could be out of sync with component state

## Solution Implementation

### 1. Consolidated Data Fetching Logic

**Before (useDashboardData.ts):**
```typescript
useEffect(() => {
  if (!isUserLoaded || !user?.id) return;
  fetchData();
}, [isUserLoaded, viewingAllAccounts, user?.id]);

useEffect(() => {
  if (user?.id) {
    fetchData();
  }
}, [viewingAllAccounts, isMasterAccount, user?.id]);
```

**After:**
```typescript
const [isAuthReady, setIsAuthReady] = useState(false);

// Consolidated effect that waits for both auth and user data to be ready
useEffect(() => {
  if (isUserLoaded && user?.id) {
    const timer = setTimeout(() => {
      setIsAuthReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }
}, [isUserLoaded, user?.id, isMasterAccount]);

// Single effect for data fetching with debounce
useEffect(() => {
  if (!isAuthReady || !user?.id) return;
  
  const timer = setTimeout(() => {
    fetchData();
  }, 50);
  
  return () => clearTimeout(timer);
}, [isAuthReady, viewingAllAccounts, isMasterAccount, user?.id]);
```

### 2. Enhanced ProtectedRoute

Added master account status checking before rendering components:

```typescript
const [isMasterStatusChecked, setIsMasterStatusChecked] = useState(false);

useEffect(() => {
  if (authState === 'Authenticated' && user?.id) {
    checkMasterAccountStatus(user.id).then((isMaster) => {
      setIsMasterStatusChecked(true);
    });
  }
}, [authState, user?.id, checkMasterAccountStatus]);

// Wait for both auth and master status to be ready
if (authState === 'Loading' || (authState === 'Authenticated' && !isMasterStatusChecked)) {
  return <LoadingScreen />;
}
```

### 3. Improved State Synchronization

Added debugging and better state management in `useAuth`:

```typescript
setIsMasterAccount: (isMaster: boolean) => {
  console.log('[DEBUG] Setting isMasterAccount:', isMaster);
  set({ isMasterAccount: isMaster });
},
```

### 4. Debouncing and Race Prevention

- Added debouncing (50-100ms delays) to prevent rapid successive calls
- Consolidated multiple effects into single effects
- Added proper cleanup with `clearTimeout`

## Files Modified

1. `src/hooks/useDashboardData.ts` - Main dashboard data logic
2. `src/pages/reviews/ReviewCyclesPage.tsx` - Review cycles page
3. `src/pages/analytics/index.tsx` - Analytics page  
4. `src/pages/employees/EmployeesPage.tsx` - Employees page
5. `src/components/auth/ProtectedRoute.tsx` - Auth guard component
6. `src/hooks/useAuth.ts` - Auth state management

## Expected Behavior After Fix

1. **Consistent Master Mode State:** The UI will properly remember and display Master Mode status without requiring page refreshes
2. **Proper Data Loading:** When Master Mode is enabled, all accounts' data will be loaded consistently
3. **No Race Conditions:** State changes will be properly synchronized before data fetching occurs
4. **Better Debugging:** Console logs will show the proper sequence of state changes

## Technical Benefits

- **Eliminated Race Conditions:** Multiple effects no longer compete and override each other
- **Improved User Experience:** No more need to refresh pages to see correct Master Mode state
- **Better Performance:** Debouncing prevents excessive API calls
- **Enhanced Debugging:** Added logging to track state changes and identify future issues
- **Maintainable Code:** Consolidated logic is easier to understand and modify

## Testing

To verify the fix:

1. Enable Master Mode in Settings
2. Navigate to Dashboard - should immediately show master view indicators
3. Dropdown should show all accounts' cycles without refresh
4. Switch between pages - master mode should persist consistently
5. Disable Master Mode - should immediately revert to user-only data 