-- Wrap entire migration in a transaction for atomicity
BEGIN;

-- Check if function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'is_master_account'
  ) THEN
    RAISE EXCEPTION 'The is_master_account function does not exist. Please run the user_roles migration first.';
  END IF;
END
$$;

-- Employees table policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'employees' 
    AND policyname = 'Master accounts can view all employees'
  ) THEN
    EXECUTE 'CREATE POLICY "Master accounts can view all employees"
      ON public.employees
      FOR SELECT
      USING (
        user_id = auth.uid() OR 
        public.is_master_account()
      )';
    RAISE NOTICE 'Created policy: Master accounts can view all employees';
  ELSE
    RAISE NOTICE 'Policy Master accounts can view all employees already exists';
  END IF;
END
$$;

-- Feedback requests table policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'feedback_requests' 
    AND policyname = 'Master accounts can view all feedback requests'
  ) THEN
    EXECUTE 'CREATE POLICY "Master accounts can view all feedback requests"
      ON public.feedback_requests
      FOR SELECT
      USING (
        review_cycle_id IN (
          SELECT id FROM public.review_cycles
          WHERE user_id = auth.uid() OR public.is_master_account()
        )
      )';
    RAISE NOTICE 'Created policy: Master accounts can view all feedback requests';
  ELSE
    RAISE NOTICE 'Policy Master accounts can view all feedback requests already exists';
  END IF;
END
$$;

-- Feedback responses table policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'feedback_responses' 
    AND policyname = 'Master accounts can view all feedback responses'
  ) THEN
    EXECUTE 'CREATE POLICY "Master accounts can view all feedback responses"
      ON public.feedback_responses
      FOR SELECT
      USING (
        feedback_request_id IN (
          SELECT id FROM public.feedback_requests
          WHERE review_cycle_id IN (
            SELECT id FROM public.review_cycles
            WHERE user_id = auth.uid() OR public.is_master_account()
          )
        )
      )';
    RAISE NOTICE 'Created policy: Master accounts can view all feedback responses';
  ELSE
    RAISE NOTICE 'Policy Master accounts can view all feedback responses already exists';
  END IF;
END
$$;

-- Output completion message
DO $$
BEGIN
  RAISE NOTICE 'Master account access policies added successfully';
END $$;

COMMIT; 