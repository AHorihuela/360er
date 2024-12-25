-- Drop and recreate the trigger function with debug logging
DROP TRIGGER IF EXISTS handle_feedback_response ON feedback_responses;
DROP FUNCTION IF EXISTS handle_feedback_response();

CREATE OR REPLACE FUNCTION handle_feedback_response()
RETURNS TRIGGER AS $$
BEGIN
    RAISE LOG 'Trigger executing for feedback response: %', to_json(NEW);
    RAISE LOG 'Fields present: %', array_to_string(array(SELECT key FROM json_each_text(to_json(NEW))), ', ');
    
    -- Set timestamps
    NEW.submitted_at := NOW();
    NEW.created_at := NOW();
    
    RAISE LOG 'After setting timestamps: %', to_json(NEW);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER handle_feedback_response
    BEFORE INSERT ON feedback_responses
    FOR EACH ROW
    EXECUTE FUNCTION handle_feedback_response();

-- Drop and recreate RLS policies with debug
DROP POLICY IF EXISTS "Anyone can submit feedback responses" ON feedback_responses;
DROP POLICY IF EXISTS "Anyone can view feedback requests" ON feedback_requests;

-- Create more permissive policies
CREATE POLICY "Anyone can submit feedback responses"
ON feedback_responses
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Anyone can view feedback requests"
ON feedback_requests
FOR SELECT
TO anon
USING (true);

-- Enable RLS
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON feedback_responses TO anon;
GRANT SELECT ON feedback_requests TO anon;

-- Verify RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM
    pg_policies
WHERE
    tablename IN ('feedback_responses', 'feedback_requests');

-- Verify permissions
SELECT
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM
    information_schema.role_table_grants
WHERE
    grantee = 'anon'
    AND table_name IN ('feedback_responses', 'feedback_requests');

-- Test insert directly
DO $$
BEGIN
    RAISE NOTICE 'Testing direct insert...';
    INSERT INTO feedback_responses (
        feedback_request_id,
        relationship,
        strengths,
        areas_for_improvement
    ) VALUES (
        '92fbee65-ff81-4d70-8c32-45a0c3ed7218',
        'equal_colleague',
        'test strengths',
        'test improvements'
    );
    RAISE NOTICE 'Direct insert successful';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Direct insert failed: %', SQLERRM;
END $$; 