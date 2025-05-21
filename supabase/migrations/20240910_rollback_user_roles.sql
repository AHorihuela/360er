-- Rollback script for user_roles migration
-- Use this script if you need to reverse the changes

-- Remove the new RLS policy from review_cycles
DROP POLICY IF EXISTS "Master accounts can view all review cycles" ON public.review_cycles;

-- Drop the master account check function
DROP FUNCTION IF EXISTS public.is_master_account();

-- Drop the user_roles table 
DROP TABLE IF EXISTS public.user_roles;

-- Drop the enum type
DROP TYPE IF EXISTS user_role_type;

-- Output confirmation message
DO $$
BEGIN
  RAISE NOTICE 'Rollback of master account feature completed successfully';
END $$; 