-- First backup existing policies
CREATE TABLE IF NOT EXISTS policy_backup_20240130_employees_final AS
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'employees';

-- Drop existing policies
DROP POLICY IF EXISTS "employees_auth_access" ON employees;
DROP POLICY IF EXISTS "employees_anon_access" ON employees;

-- Clear permissions
REVOKE ALL ON employees FROM anon, authenticated;

-- Create base policy for authenticated users to manage their own records
CREATE POLICY "employees_self_access"
ON employees
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create policy for managers to view their employees
CREATE POLICY "employees_manager_access"
ON employees
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM review_cycles rc
        WHERE rc.user_id = auth.uid()
        AND EXISTS (
            SELECT 1 
            FROM feedback_requests fr
            WHERE fr.review_cycle_id = rc.id
            AND fr.employee_id = employees.id
        )
    )
);

-- Create policy for anonymous access through feedback links
CREATE POLICY "employees_anon_access"
ON employees
FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 
        FROM feedback_requests fr
        WHERE fr.employee_id = employees.id
        AND fr.unique_link IS NOT NULL
    )
);

-- Grant minimum necessary permissions
GRANT SELECT ON employees TO anon;
GRANT ALL ON employees TO authenticated;

-- Verify policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'employees'
        AND policyname IN (
            'employees_self_access',
            'employees_manager_access',
            'employees_anon_access'
        )
    ) THEN
        RAISE EXCEPTION 'Missing policies on employees table';
    END IF;
END
$$; 