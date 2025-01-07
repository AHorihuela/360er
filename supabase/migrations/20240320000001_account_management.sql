-- Function to delete user account and all associated data
CREATE OR REPLACE FUNCTION public.delete_user_account()
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

    -- Delete all review cycles (will cascade to all dependent tables)
    DELETE FROM review_cycles WHERE user_id = v_user_id;

    -- Delete all employees (no cascade needed as feedback_requests were deleted by review_cycles cascade)
    DELETE FROM employees WHERE user_id = v_user_id;

    -- Verify deletion
    SELECT COUNT(*) INTO v_count
    FROM (
        SELECT id FROM employees WHERE user_id = v_user_id
        UNION ALL
        SELECT id FROM review_cycles WHERE user_id = v_user_id
    ) remaining;

    IF v_count > 0 THEN
        RAISE EXCEPTION 'Failed to delete all user data';
    END IF;

    -- Delete the user from auth.users
    DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- Add comment for function documentation
COMMENT ON FUNCTION public.delete_user_account IS 'Deletes all data associated with the current user''s account and the auth user'; 