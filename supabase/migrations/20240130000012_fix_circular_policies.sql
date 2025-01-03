-- Drop existing policies
DROP POLICY IF EXISTS "review_cycles_public_access" ON review_cycles;
DROP POLICY IF EXISTS "review_cycles_base_access" ON review_cycles;
DROP POLICY IF EXISTS "feedback_requests_anon_access" ON feedback_requests;
DROP POLICY IF EXISTS "feedback_requests_auth_access" ON feedback_requests;
DROP POLICY IF EXISTS "feedback_responses_anon_access" ON feedback_responses;
DROP POLICY IF EXISTS "feedback_responses_auth_access" ON feedback_responses;

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
USING (EXISTS (
    SELECT 1 FROM feedback_requests
    WHERE review_cycle_id = review_cycles.id
    AND unique_link IS NOT NULL
));

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

-- Verify permissions
DO $$
BEGIN
    -- Ensure proper permissions
    GRANT SELECT ON review_cycles TO anon;
    GRANT ALL ON review_cycles TO authenticated;
    
    GRANT SELECT, UPDATE ON feedback_requests TO anon;
    GRANT ALL ON feedback_requests TO authenticated;
    
    GRANT SELECT, INSERT ON feedback_responses TO anon;
    GRANT ALL ON feedback_responses TO authenticated;
END $$; 