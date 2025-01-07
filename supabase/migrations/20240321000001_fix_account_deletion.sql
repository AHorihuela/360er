-- Drop existing function
DROP FUNCTION IF EXISTS delete_user_account();

-- Create new function that uses service_role to delete auth user
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_count integer;
BEGIN
    -- Get the current user's ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Delete all review cycles (will cascade to feedback_requests, responses, analytics, etc.)
    DELETE FROM review_cycles WHERE user_id = v_user_id;

    -- Delete all employees
    DELETE FROM employees WHERE user_id = v_user_id;

    -- Verify deletion of application data
    SELECT COUNT(*) INTO v_count
    FROM (
        SELECT id FROM employees WHERE user_id = v_user_id
        UNION ALL
        SELECT id FROM review_cycles WHERE user_id = v_user_id
    ) remaining;

    IF v_count > 0 THEN
        RAISE EXCEPTION 'Failed to delete all user data';
    END IF;

    -- Delete the user from auth.users using service_role
    -- This requires the function to be executed with service_role permissions
    EXECUTE format(
        'DELETE FROM auth.users WHERE id = %L',
        v_user_id
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- Add comment for function documentation
COMMENT ON FUNCTION delete_user_account IS 'Deletes all data associated with the current user''s account and removes the auth user';

-- Create policy to allow service_role to delete from auth.users
CREATE POLICY "service_role_delete_users"
ON auth.users
FOR DELETE
TO service_role
USING (true); 