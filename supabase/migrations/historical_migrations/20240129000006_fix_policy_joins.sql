-- Drop the incorrect policies
DROP POLICY IF EXISTS "Anyone can view associated employees" ON employees;
DROP POLICY IF EXISTS "Anyone can view associated review cycles" ON review_cycles;

-- Create correct policies
DO $$ BEGIN
CREATE POLICY "Anyone can view associated employees"
ON employees
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM feedback_requests fr
        WHERE fr.employee_id = employees.id
    )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "Anyone can view associated review cycles"
ON review_cycles
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM feedback_requests fr
        WHERE fr.review_cycle_id = review_cycles.id
    )
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$; 