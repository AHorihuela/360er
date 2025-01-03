-- Drop existing policies that are causing recursion
DROP POLICY IF EXISTS "employees_anon_access" ON "public"."employees";
DROP POLICY IF EXISTS "employees_manager_access" ON "public"."employees";
DROP POLICY IF EXISTS "feedback_requests_anon_access" ON "public"."feedback_requests";
DROP POLICY IF EXISTS "feedback_requests_auth_access" ON "public"."feedback_requests";

-- Recreate policies with optimized structure
CREATE POLICY "employees_anon_access" ON "public"."employees"
AS PERMISSIVE FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM feedback_requests fr
    WHERE fr.employee_id = employees.id 
    AND fr.unique_link IS NOT NULL
  )
);

CREATE POLICY "employees_manager_access" ON "public"."employees"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM review_cycles rc
    WHERE rc.user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM feedback_requests fr
      WHERE fr.review_cycle_id = rc.id 
      AND fr.employee_id = employees.id
    )
  )
);

CREATE POLICY "feedback_requests_anon_access" ON "public"."feedback_requests"
AS PERMISSIVE FOR SELECT
TO public
USING (unique_link IS NOT NULL);

CREATE POLICY "feedback_requests_auth_access" ON "public"."feedback_requests"
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  review_cycle_id IN (
    SELECT id FROM review_cycles 
    WHERE user_id = auth.uid()
  )
); 