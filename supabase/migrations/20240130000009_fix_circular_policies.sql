-- Backup existing policies
CREATE TABLE IF NOT EXISTS policy_backup_20240130_circular AS
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Drop all existing policies
DROP POLICY IF EXISTS "review_cycles_owner_access" ON review_cycles;
DROP POLICY IF EXISTS "review_cycles_public_access" ON review_cycles;
DROP POLICY IF EXISTS "employees_owner_access" ON employees;
DROP POLICY IF EXISTS "employees_public_access" ON employees;
DROP POLICY IF EXISTS "feedback_requests_owner_access" ON feedback_requests;
DROP POLICY IF EXISTS "feedback_requests_public_access" ON feedback_requests;
DROP POLICY IF EXISTS "feedback_requests_public_update" ON feedback_requests;

-- Create new non-circular policies
-- Review Cycles (base table, no dependencies)
CREATE POLICY "review_cycles_base_access"
ON review_cycles
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Feedback Requests (depends on review_cycles)
CREATE POLICY "feedback_requests_auth_access"
ON feedback_requests
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM review_cycles
        WHERE id = feedback_requests.review_cycle_id
        AND user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM review_cycles
        WHERE id = feedback_requests.review_cycle_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "feedback_requests_anon_access"
ON feedback_requests
FOR SELECT
TO public
USING (unique_link IS NOT NULL);

CREATE POLICY "feedback_requests_anon_update"
ON feedback_requests
FOR UPDATE
TO public
USING (unique_link IS NOT NULL AND status = 'pending')
WITH CHECK (status = 'submitted');

-- Employees (depends on feedback_requests)
CREATE POLICY "employees_auth_access"
ON employees
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "employees_anon_access"
ON employees
FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM feedback_requests
        WHERE employee_id = employees.id
        AND unique_link IS NOT NULL
    )
);

-- Verify permissions
GRANT SELECT ON review_cycles TO anon;
GRANT ALL ON review_cycles TO authenticated;

GRANT SELECT, UPDATE ON feedback_requests TO anon;
GRANT ALL ON feedback_requests TO authenticated;

GRANT SELECT ON employees TO anon;
GRANT ALL ON employees TO authenticated;

-- Add materialized view for performance
CREATE MATERIALIZED VIEW IF NOT EXISTS review_cycles_feedback_summary AS
SELECT 
    rc.id as review_cycle_id,
    rc.user_id,
    COUNT(fr.id) as total_requests,
    COUNT(CASE WHEN fr.status = 'completed' THEN 1 END) as completed_requests
FROM review_cycles rc
LEFT JOIN feedback_requests fr ON fr.review_cycle_id = rc.id
GROUP BY rc.id, rc.user_id
WITH NO DATA;

CREATE UNIQUE INDEX ON review_cycles_feedback_summary (review_cycle_id);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_review_cycles_summary()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY review_cycles_feedback_summary;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh materialized view
DROP TRIGGER IF EXISTS refresh_review_cycles_summary ON feedback_requests;
CREATE TRIGGER refresh_review_cycles_summary
    AFTER INSERT OR UPDATE OR DELETE
    ON feedback_requests
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_review_cycles_summary(); 