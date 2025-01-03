-- Backup existing policies
CREATE TABLE IF NOT EXISTS policy_backup_20240130_final AS
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Drop all existing policies for these tables
DROP POLICY IF EXISTS "view_employees_by_feedback_link" ON employees;
DROP POLICY IF EXISTS "users_view_own_employees" ON employees;
DROP POLICY IF EXISTS "Users can view their own employees" ON employees;
DROP POLICY IF EXISTS "Users can update their own employees" ON employees;
DROP POLICY IF EXISTS "Users can insert their own employees" ON employees;
DROP POLICY IF EXISTS "Users can delete their own employees" ON employees;

DROP POLICY IF EXISTS "view_feedback_requests_by_unique_link" ON feedback_requests;
DROP POLICY IF EXISTS "users_view_own_feedback_requests" ON feedback_requests;
DROP POLICY IF EXISTS "Users can update feedback requests for their review cycles" ON feedback_requests;
DROP POLICY IF EXISTS "Users can delete feedback requests for their review cycles" ON feedback_requests;
DROP POLICY IF EXISTS "Users can create feedback requests for their review cycles" ON feedback_requests;
DROP POLICY IF EXISTS "anon_update_feedback_status" ON feedback_requests;

DROP POLICY IF EXISTS "view_review_cycles_by_feedback_link" ON review_cycles;
DROP POLICY IF EXISTS "users_view_review_cycles" ON review_cycles;
DROP POLICY IF EXISTS "users_view_own_review_cycles" ON review_cycles;
DROP POLICY IF EXISTS "Users can view their own review cycles" ON review_cycles;
DROP POLICY IF EXISTS "Users can update their own review cycles" ON review_cycles;
DROP POLICY IF EXISTS "Users can delete their own review cycles" ON review_cycles;
DROP POLICY IF EXISTS "Users can create their own review cycles" ON review_cycles;
DROP POLICY IF EXISTS "Anyone can view associated review cycles" ON review_cycles;
DROP POLICY IF EXISTS "anon_view_review_cycles" ON review_cycles;

-- Create new non-recursive policies
-- Review Cycles (base table)
CREATE POLICY "review_cycles_owner_access"
ON review_cycles
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

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

-- Employees
CREATE POLICY "employees_owner_access"
ON employees
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "employees_public_access"
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

-- Feedback Requests
CREATE POLICY "feedback_requests_owner_access"
ON feedback_requests
FOR ALL
TO authenticated
USING (
    review_cycle_id IN (
        SELECT id FROM review_cycles 
        WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    review_cycle_id IN (
        SELECT id FROM review_cycles 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "feedback_requests_public_access"
ON feedback_requests
FOR SELECT
TO public
USING (unique_link IS NOT NULL);

CREATE POLICY "feedback_requests_public_update"
ON feedback_requests
FOR UPDATE
TO public
USING (unique_link IS NOT NULL AND status = 'pending')
WITH CHECK (status = 'submitted');

-- Verify permissions
GRANT SELECT ON review_cycles TO anon;
GRANT ALL ON review_cycles TO authenticated;

GRANT SELECT ON employees TO anon;
GRANT ALL ON employees TO authenticated;

GRANT SELECT, UPDATE ON feedback_requests TO anon;
GRANT ALL ON feedback_requests TO authenticated; 