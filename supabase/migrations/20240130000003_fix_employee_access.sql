-- Drop existing policies for employees table
DROP POLICY IF EXISTS "Users can view their employees" ON employees;
DROP POLICY IF EXISTS "anon_view_employees" ON employees;

-- Create new policies that handle both cases
CREATE POLICY "view_employees_by_feedback_link"
ON employees
FOR SELECT
TO public -- This applies to both authenticated and anonymous users
USING (
    id IN (
        SELECT employee_id 
        FROM feedback_requests 
        WHERE unique_link IS NOT NULL
    )
);

CREATE POLICY "users_view_own_employees"
ON employees
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM review_cycles rc
        JOIN feedback_requests fr ON fr.review_cycle_id = rc.id
        WHERE fr.employee_id = employees.id
        AND rc.user_id = auth.uid()
    )
);

-- Ensure proper permissions are granted
GRANT SELECT ON employees TO anon;
GRANT SELECT ON employees TO authenticated; 