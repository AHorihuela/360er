-- First, backup all existing policies
CREATE TABLE IF NOT EXISTS policy_backup_20240130_final AS
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Drop ALL existing policies for these tables
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('review_cycles', 'feedback_requests', 'feedback_responses', 'employees')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END
$$;

-- Verify RLS is enabled
ALTER TABLE review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Clear all permissions first
REVOKE ALL ON review_cycles FROM anon, authenticated;
REVOKE ALL ON feedback_requests FROM anon, authenticated;
REVOKE ALL ON feedback_responses FROM anon, authenticated;
REVOKE ALL ON employees FROM anon, authenticated;

-- Simplified review_cycles policies
CREATE POLICY "review_cycles_auth_access"
ON review_cycles
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "review_cycles_anon_access"
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

-- Simplified feedback_requests policies
CREATE POLICY "feedback_requests_auth_access"
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

CREATE POLICY "feedback_requests_anon_access"
ON feedback_requests
FOR SELECT
TO public
USING (unique_link IS NOT NULL);

-- Simplified feedback_responses policies
CREATE POLICY "feedback_responses_auth_access"
ON feedback_responses
FOR ALL
TO authenticated
USING (
    feedback_request_id IN (
        SELECT id FROM feedback_requests
        WHERE review_cycle_id IN (
            SELECT id FROM review_cycles
            WHERE user_id = auth.uid()
        )
    )
)
WITH CHECK (
    feedback_request_id IN (
        SELECT id FROM feedback_requests
        WHERE review_cycle_id IN (
            SELECT id FROM review_cycles
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "feedback_responses_anon_access"
ON feedback_responses
FOR SELECT
TO public
USING (
    feedback_request_id IN (
        SELECT id FROM feedback_requests
        WHERE unique_link IS NOT NULL
    )
);

CREATE POLICY "feedback_responses_anon_submit"
ON feedback_responses
FOR INSERT
TO public
WITH CHECK (
    feedback_request_id IN (
        SELECT id FROM feedback_requests
        WHERE unique_link IS NOT NULL
        AND status != 'closed'
        AND review_cycle_id IN (
            SELECT id FROM review_cycles
            WHERE review_by_date >= CURRENT_DATE
        )
    )
);

-- Simplified employees policies
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
    id IN (
        SELECT employee_id 
        FROM feedback_requests 
        WHERE unique_link IS NOT NULL
    )
);

-- Grant minimum necessary permissions
GRANT SELECT ON review_cycles TO anon;
GRANT ALL ON review_cycles TO authenticated;

GRANT SELECT, UPDATE ON feedback_requests TO anon;
GRANT ALL ON feedback_requests TO authenticated;

GRANT SELECT, INSERT ON feedback_responses TO anon;
GRANT ALL ON feedback_responses TO authenticated;

GRANT SELECT ON employees TO anon;
GRANT ALL ON employees TO authenticated;

-- Verify policies are created
DO $$
DECLARE
    expected_policies text[] := ARRAY[
        'review_cycles_auth_access',
        'review_cycles_anon_access',
        'feedback_requests_auth_access',
        'feedback_requests_anon_access',
        'feedback_responses_auth_access',
        'feedback_responses_anon_access',
        'feedback_responses_anon_submit',
        'employees_auth_access',
        'employees_anon_access'
    ];
    missing_policies text := '';
BEGIN
    FOR i IN 1..array_length(expected_policies, 1) LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND policyname = expected_policies[i]
        ) THEN
            missing_policies := missing_policies || expected_policies[i] || ', ';
        END IF;
    END LOOP;

    IF length(missing_policies) > 0 THEN
        RAISE EXCEPTION 'Missing policies: %', missing_policies;
    END IF;
END
$$; 