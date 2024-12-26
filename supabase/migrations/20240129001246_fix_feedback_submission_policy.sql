-- Drop and recreate the anonymous feedback submission policy
DROP POLICY IF EXISTS "anon_submit_feedback_responses" ON feedback_responses;

CREATE POLICY "anon_submit_feedback_responses"
ON feedback_responses
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM feedback_requests fr
    WHERE fr.id = feedback_request_id
    AND fr.unique_link IS NOT NULL
    AND fr.status = 'pending'
  )
);

-- Test the policy
DO $$
DECLARE
  v_request_id uuid := '92fbee65-ff81-4d70-8c32-45a0c3ed7218';
BEGIN
  -- Test if we can insert a response
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
    
    RAISE NOTICE 'Can insert feedback response: YES';
    -- Clean up test data
    DELETE FROM feedback_responses 
    WHERE feedback_request_id = v_request_id 
    AND strengths = 'Test strength';
    
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Can insert feedback response: NO - %', SQLERRM;
  END;
END $$; 