-- Wrap entire migration in a transaction for atomicity
BEGIN;

-- Create an enum for user roles
CREATE TYPE user_role_type AS ENUM ('regular', 'master');

-- Create a user_roles table to store user role information
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role_type NOT NULL DEFAULT 'regular',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Add RLS policies
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Only allow users to see their own role
CREATE POLICY "Users can view their own role"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only allow master accounts to update roles
CREATE POLICY "Only master accounts can update roles"
  ON public.user_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'master'
    )
  );
  
-- Only allow master accounts to insert new roles
CREATE POLICY "Only master accounts can insert roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'master'
    )
  );

-- Create function to check if user is a master account
CREATE OR REPLACE FUNCTION public.is_master_account()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'master'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if policy already exists before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'review_cycles' 
    AND policyname = 'Master accounts can view all review cycles'
  ) THEN
    -- Update RLS policy for review_cycles table to allow master accounts to see all cycles
    EXECUTE 'CREATE POLICY "Master accounts can view all review cycles"
      ON public.review_cycles
      FOR SELECT
      USING (
        user_id = auth.uid() OR 
        public.is_master_account()
      )';
  END IF;
END
$$;

-- Add special policy for first master account insertion
-- Since we need a way to insert the first master account without checking
CREATE POLICY "First master account insertion"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'master')
  );

-- Add initial master account (replace with actual user ID in production)
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('your-master-user-id', 'master');

-- Output completion message
DO $$
BEGIN
  RAISE NOTICE 'Master account feature added successfully';
END $$;

COMMIT; 