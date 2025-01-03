-- Drop existing policies
DROP POLICY IF EXISTS "employees_auth_access" ON employees;
DROP POLICY IF EXISTS "employees_anon_access" ON employees;

-- Clear permissions
REVOKE ALL ON employees FROM anon, authenticated;

-- Create new policies
CREATE POLICY "employees_auth_access"
ON employees
FOR ALL
TO authenticated
USING (
    -- User can access their own record
    user_id = auth.uid()
    OR 
    -- User can access employees they manage (through review cycles)
    id IN (
        SELECT employee_id 
        FROM feedback_requests fr
        JOIN review_cycles rc ON fr.review_cycle_id = rc.id
        WHERE rc.user_id = auth.uid()
    )
)
WITH CHECK (user_id = auth.uid());

CREATE POLICY "employees_anon_access"
ON employees
FOR SELECT
TO public
USING (
    id IN (
        SELECT employee_id 
        FROM feedback_requests 
        WHERE unique_link IS NOT NULL
    )
);

-- Grant permissions
GRANT SELECT ON employees TO anon;
GRANT ALL ON employees TO authenticated;

-- Verify policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'employees'
        AND policyname IN ('employees_auth_access', 'employees_anon_access')
    ) THEN
        RAISE EXCEPTION 'Missing policies on employees table';
    END IF;
END
$$; 