# Supabase Security Fixes

This document outlines the security warnings found in Supabase and how to fix them.

## Function Search Path Security (RESOLVED)

**Issue**: Multiple functions had mutable search_path, creating potential security vulnerabilities where malicious users could hijack function calls.

**Warning Details**:
- Level: WARN
- Category: SECURITY
- Description: "Detects functions where the search_path parameter is not set"
- Remediation: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

**Affected Functions**:
- `public.is_master_account`
- `public.check_ai_report_content`
- `public.delete_feedback_with_references`
- `public.log_policy_evaluation`
- `public.random_feedback_text`
- `public.set_review_cycle_created_by`
- `public.trigger_set_updated_at`
- `public.update_review_cycle_status`
- `public.update_updated_at_column`
- `public.create_feedback_response`
- `public.update_feedback_request_status`

**Solution**: Added `SET search_path = ''` to all function definitions. This prevents search path manipulation attacks by ensuring functions use fully qualified table names.

**Migration**: `20241222_fix_function_search_path_security_SAFE.sql` (audited version)

## Audit Results

### Pre-Migration Audit Findings

**Critical Issues Found**:
1. Some functions mentioned in warnings (`is_master_account`, `get_user_emails`, `check_feedback_response_delete`) don't exist in current schema
2. Some functions already have proper search_path configuration (`delete_user_account`, `handle_feedback_response`)
3. Function implementations differ between warnings and actual schema (e.g., `trigger_set_updated_at` uses UTC timezone)

**Functions Actually Fixed**:
- `public.check_ai_report_content` ✅
- `public.delete_feedback_with_references` ✅
- `public.log_policy_evaluation` ✅
- `public.random_feedback_text` ✅ (preserved existing extensive arrays)
- `public.set_review_cycle_created_by` ✅
- `public.trigger_set_updated_at` ✅ (preserved UTC timezone behavior)
- `public.update_review_cycle_status` ✅
- `public.update_updated_at_column` ✅
- `public.create_feedback_response` ✅
- `public.update_feedback_request_status` ✅

**Functions Skipped** (already secure):
- `public.delete_user_account` (already has `SET "search_path" TO 'public'`)
- `public.handle_feedback_response` (already has `SET "search_path" TO 'public'`)

**Functions Not Found** (mentioned in warnings but don't exist):
- `public.is_master_account` 
- `public.get_user_emails`
- `public.check_feedback_response_delete`

## Auth Configuration Issues (MANUAL FIX REQUIRED)

### 1. OTP Long Expiry

**Issue**: OTP expiry is set to more than 1 hour, which is not recommended for security.

**Current Setting**: > 1 hour
**Recommended Setting**: < 1 hour (ideally 10-15 minutes)

**How to Fix**:
1. Go to Supabase Dashboard → Authentication → Settings
2. Find "OTP expiry" setting
3. Set to a value less than 3600 seconds (1 hour)
4. Recommended: 600 seconds (10 minutes) for better security

### 2. Leaked Password Protection Disabled

**Issue**: Supabase's leaked password protection feature is disabled. This feature checks passwords against HaveIBeenPwned.org to prevent use of compromised passwords.

**How to Fix**:
1. Go to Supabase Dashboard → Authentication → Settings
2. Find "Password Protection" or "Leaked Password Protection" section
3. Enable the feature to check passwords against known breaches

## Security Best Practices Applied

1. **Function Security**: All functions now use `SET search_path = ''` to prevent path manipulation
2. **Fully Qualified Names**: All table references in functions use `public.table_name` format
3. **SECURITY DEFINER**: Functions that need elevated privileges properly use `SECURITY DEFINER` with secure search_path

## Verification

After applying the migration, you can verify the fixes by:

1. Running the Supabase linter again to check for remaining warnings
2. Checking function definitions with:
   ```sql
   SELECT proname, prosrc 
   FROM pg_proc 
   WHERE proname IN ('is_master_account', 'check_ai_report_content', 'delete_feedback_with_references')
   AND prosrc LIKE '%SET search_path%';
   ```

## Notes

- Functions `get_user_emails` and `check_feedback_response_delete` mentioned in warnings do not exist in current schema
- All existing functionality is preserved while adding security enhancements
- No breaking changes to application code required 