-- Ensure schema usage
GRANT USAGE ON SCHEMA public TO anon;

-- Ensure all necessary permissions are granted
GRANT SELECT ON feedback_requests TO anon;
GRANT SELECT ON employees TO anon;
GRANT SELECT ON review_cycles TO anon;
GRANT SELECT, INSERT ON feedback_responses TO anon;

-- Add debug logging
DO $$
DECLARE
  v_request_id uuid := '92fbee65-ff81-4d70-8c32-45a0c3ed7218';
  v_unique_link text;
BEGIN
  -- Get the unique link for our test request
  SELECT unique_link INTO v_unique_link
  FROM feedback_requests
  WHERE id = v_request_id;

  RAISE NOTICE 'Testing permissions for request % with link %', v_request_id, v_unique_link;
  
  -- Test feedback request access
  IF EXISTS (
    SELECT 1 
    FROM feedback_requests fr
    WHERE fr.id = v_request_id
  ) THEN
    RAISE NOTICE 'Can access feedback request: YES';
    
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
      
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Can insert feedback response: NO - %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Can access feedback request: NO';
  END IF;
END $$; 