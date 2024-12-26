-- First, enable RLS on all relevant tables
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_cycles ENABLE ROW LEVEL SECURITY;

-- Grant basic permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON feedback_requests TO anon;
GRANT SELECT ON employees TO anon;
GRANT SELECT ON review_cycles TO anon;
GRANT SELECT, INSERT ON feedback_responses TO anon;

-- Drop existing anonymous policies
DROP POLICY IF EXISTS "anon_access_feedback_requests" ON feedback_requests;
DROP POLICY IF EXISTS "anon_submit_feedback_responses" ON feedback_responses;
DROP POLICY IF EXISTS "anon_view_feedback_responses" ON feedback_responses;

-- Create simple policy for viewing feedback requests
CREATE POLICY "anon_access_feedback_requests"
ON feedback_requests
FOR SELECT
TO anon
USING (unique_link IS NOT NULL);

-- Create simple policy for submitting feedback
CREATE POLICY "anon_submit_feedback_responses"
ON feedback_responses
FOR INSERT
TO anon
WITH CHECK (true);  -- We'll rely on application logic for validation

-- Create simple policy for viewing feedback responses
CREATE POLICY "anon_view_feedback_responses"
ON feedback_responses
FOR SELECT
TO anon
USING (true);  -- Allow viewing all responses

-- Test the setup
DO $$
DECLARE
  v_request_id uuid := '92fbee65-ff81-4d70-8c32-45a0c3ed7218';
BEGIN
  RAISE NOTICE 'Testing anonymous access...';
  
  -- Test feedback request access
  IF EXISTS (
    SELECT 1 
    FROM feedback_requests 
    WHERE id = v_request_id
  ) THEN
    RAISE NOTICE 'Can view feedback request: YES';
    
    -- Test feedback submission
    BEGIN
      INSERT INTO feedback_responses (
        feedback_request_id,
        relationship,
        strengths,
        areas_for_improvement
      ) VALUES (
        v_request_id,
        'equal_colleague',
        'Test strength',
        'Test improvement'
      );
      
      RAISE NOTICE 'Can submit feedback: YES';
      
      -- Clean up test data
      DELETE FROM feedback_responses 
      WHERE feedback_request_id = v_request_id 
      AND strengths = 'Test strength';
      
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Can submit feedback: NO - %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Can view feedback request: NO';
  END IF;
END $$; 