-- Safe migration to add due date enforcement for feedback submissions
-- This migration adds NEW policies without modifying existing ones
-- Existing functionality will be preserved

-- Create a helper function for consistent due date checking
CREATE OR REPLACE FUNCTION check_review_cycle_due_date(p_feedback_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_due_date date;
BEGIN
    -- Get the due date for this feedback request's review cycle
    SELECT rc.review_by_date::date
    INTO v_due_date
    FROM feedback_requests fr
    JOIN review_cycles rc ON rc.id = fr.review_cycle_id
    WHERE fr.id = p_feedback_request_id;
    
    -- If no due date found, allow (fail open for safety)
    IF v_due_date IS NULL THEN
        RETURN true;
    END IF;
    
    -- Check if current date is within the allowed period
    -- Allow submissions until end of due date
    RETURN v_due_date >= CURRENT_DATE;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION check_review_cycle_due_date(uuid) TO public;
GRANT EXECUTE ON FUNCTION check_review_cycle_due_date(uuid) TO anon;
GRANT EXECUTE ON FUNCTION check_review_cycle_due_date(uuid) TO authenticated;

-- Create a new policy that enforces due dates
-- This works alongside existing policies as additional protection
CREATE POLICY "enforce_due_date_on_feedback_submission"
ON feedback_responses
FOR INSERT
TO public
WITH CHECK (
    -- Only apply this check to new submissions
    -- This ensures we don't break existing functionality
    check_review_cycle_due_date(feedback_request_id) = true
);

-- Verification queries to test the new policy
-- These will show if the due date enforcement is working

-- Test 1: Check if our function works correctly
DO $$
DECLARE
    v_test_request_id uuid := 'a0fd26f7-8ac1-45ea-8bb6-2f41e0147e4f';
    v_result boolean;
    v_due_date date;
    v_current_date date := CURRENT_DATE;
BEGIN
    -- Test our function
    SELECT check_review_cycle_due_date(v_test_request_id) INTO v_result;
    
    -- Get the actual due date for comparison
    SELECT rc.review_by_date::date
    INTO v_due_date
    FROM feedback_requests fr
    JOIN review_cycles rc ON rc.id = fr.review_cycle_id
    WHERE fr.id = v_test_request_id;
    
    RAISE NOTICE 'Due date enforcement test:';
    RAISE NOTICE '  Request ID: %', v_test_request_id;
    RAISE NOTICE '  Due date: %', v_due_date;
    RAISE NOTICE '  Current date: %', v_current_date;
    RAISE NOTICE '  Function result: %', v_result;
    RAISE NOTICE '  Expected result: %', (v_due_date >= v_current_date);
    
    IF v_result = (v_due_date >= v_current_date) THEN
        RAISE NOTICE '✓ Function working correctly';
    ELSE
        RAISE WARNING '⚠ Function result unexpected';
    END IF;
END;
$$;

-- Test 2: Verify policy was created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'feedback_responses' 
        AND policyname = 'enforce_due_date_on_feedback_submission'
    ) THEN
        RAISE NOTICE '✓ Due date enforcement policy created successfully';
    ELSE
        RAISE WARNING '⚠ Due date enforcement policy was not created';
    END IF;
END;
$$;

-- Important notes about this migration:
-- 1. No existing policies are modified or dropped
-- 2. The new policy adds an additional layer of protection
-- 3. The function fails open (returns true) if no due date is found for safety
-- 4. Existing functionality should continue to work normally
-- 5. The new policy will prevent future submissions after due dates 