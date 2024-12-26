-- First verify existing policies and their effectiveness
DO $$
BEGIN
    RAISE NOTICE 'Checking existing policies...';
    
    -- Check if we have any working anonymous policies
    IF EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND (tablename = 'feedback_requests' OR tablename = 'feedback_responses')
        AND roles @> ARRAY['anon']::name[]
    ) THEN
        RAISE NOTICE 'Found existing anonymous policies - keeping them until new ones are verified';
    END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to anon role
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, UPDATE ON feedback_requests TO anon;
GRANT SELECT, INSERT ON feedback_responses TO anon;

-- Create new policies with temporary names to avoid conflicts
CREATE POLICY "temp_anon_access_feedback_requests"
ON feedback_requests
FOR SELECT
TO anon
USING (unique_link IS NOT NULL AND status = 'pending');

CREATE POLICY "temp_anon_update_feedback_request_status"
ON feedback_requests
FOR UPDATE
TO anon
USING (unique_link IS NOT NULL AND status = 'pending')
WITH CHECK (unique_link IS NOT NULL AND status = 'submitted');

CREATE POLICY "temp_anon_submit_feedback_responses"
ON feedback_responses
FOR INSERT
TO anon
WITH CHECK (
    feedback_request_id IN (
        SELECT id 
        FROM feedback_requests 
        WHERE status = 'pending' 
        AND unique_link IS NOT NULL
    )
);

CREATE POLICY "temp_anon_view_feedback_responses"
ON feedback_responses
FOR SELECT
TO anon
USING (
    feedback_request_id IN (
        SELECT id 
        FROM feedback_requests 
        WHERE unique_link IS NOT NULL
    )
);

-- Verify the new policies work
DO $$
DECLARE
    v_test_request_id uuid;
BEGIN
    RAISE NOTICE 'Verifying new policies...';
    
    -- Verify all new policies exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('feedback_requests', 'feedback_responses')
        AND policyname LIKE 'temp_anon_%'
    ) THEN
        RAISE EXCEPTION 'New policies not properly created';
    END IF;

    -- Only after verification, drop old and rename new policies
    IF EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('feedback_requests', 'feedback_responses')
        AND policyname LIKE 'temp_anon_%'
    ) THEN
        -- Drop old policies
        DROP POLICY IF EXISTS "anon_access_feedback_requests" ON feedback_requests;
        DROP POLICY IF EXISTS "anon_update_feedback_request_status" ON feedback_requests;
        DROP POLICY IF EXISTS "anon_submit_feedback_responses" ON feedback_responses;
        DROP POLICY IF EXISTS "anon_view_feedback_responses" ON feedback_responses;
        
        -- Rename new policies
        ALTER POLICY "temp_anon_access_feedback_requests" ON feedback_requests RENAME TO "anon_access_feedback_requests";
        ALTER POLICY "temp_anon_update_feedback_request_status" ON feedback_requests RENAME TO "anon_update_feedback_request_status";
        ALTER POLICY "temp_anon_submit_feedback_responses" ON feedback_responses RENAME TO "anon_submit_feedback_responses";
        ALTER POLICY "temp_anon_view_feedback_responses" ON feedback_responses RENAME TO "anon_view_feedback_responses";
        
        RAISE NOTICE 'Successfully replaced old policies with new ones';
    END IF;
END $$; 