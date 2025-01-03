-- Add public access policy for review cycles
CREATE POLICY "review_cycles_public_access"
ON review_cycles
FOR SELECT
TO public
USING (
    id IN (
        SELECT review_cycle_id 
        FROM feedback_requests 
        WHERE unique_link IS NOT NULL
    )
);

-- Verify permissions are correct
DO $$
BEGIN
    -- Check if policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'review_cycles'
        AND policyname = 'review_cycles_public_access'
    ) THEN
        RAISE EXCEPTION 'Policy creation failed';
    END IF;

    -- Check if anon has SELECT permission
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
        AND table_name = 'review_cycles'
        AND grantee = 'anon'
        AND privilege_type = 'SELECT'
    ) THEN
        GRANT SELECT ON review_cycles TO anon;
    END IF;
END $$; 