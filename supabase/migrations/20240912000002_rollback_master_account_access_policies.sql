-- Wrap rollback in a transaction for atomicity
BEGIN;

-- Remove the master account policy from employees
DROP POLICY IF EXISTS "Master accounts can view all employees" ON public.employees;

-- Remove the master account policy from feedback_requests
DROP POLICY IF EXISTS "Master accounts can view all feedback requests" ON public.feedback_requests;

-- Remove the master account policy from feedback_responses
DROP POLICY IF EXISTS "Master accounts can view all feedback responses" ON public.feedback_responses;

-- Output completion message
DO $$
BEGIN
  RAISE NOTICE 'Master account access policies removed successfully';
END $$;

COMMIT; 