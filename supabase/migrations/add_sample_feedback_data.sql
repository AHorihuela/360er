-- First, clear existing sample data
DELETE FROM feedback_responses;
DELETE FROM feedback_requests;

-- First, let's create a function to generate random text for feedback
CREATE OR REPLACE FUNCTION random_feedback_text(category TEXT)
RETURNS TEXT AS $$
DECLARE
  strengths_array TEXT[] := ARRAY[
    'Excellent communication skills and ability to articulate complex ideas clearly',
    'Strong leadership qualities and ability to motivate team members',
    'Consistently delivers high-quality work ahead of deadlines',
    'Great problem-solving abilities and innovative thinking',
    'Exceptional team player who promotes collaboration',
    'Takes initiative and proactively identifies opportunities for improvement',
    'Demonstrates strong technical expertise and willingness to learn',
    'Excellent project management and organizational skills',
    'Shows great empathy and emotional intelligence in team interactions',
    'Reliable and consistent performer who sets high standards'
  ];
  
  improvements_array TEXT[] := ARRAY[
    'Could benefit from delegating tasks more effectively',
    'Would improve from more regular status updates on projects',
    'Could enhance strategic thinking and long-term planning',
    'Might benefit from additional technical training in specific areas',
    'Could work on time management during meetings',
    'Would benefit from more proactive communication with stakeholders',
    'Could improve documentation practices',
    'Might benefit from developing public speaking skills',
    'Could work on providing more constructive feedback to team members',
    'Would benefit from taking more calculated risks'
  ];
BEGIN
  IF category = 'strengths' THEN
    RETURN strengths_array[floor(random() * array_length(strengths_array, 1) + 1)];
  ELSE
    RETURN improvements_array[floor(random() * array_length(improvements_array, 1) + 1)];
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Modified sample data generation
DO $$
DECLARE
  employee_rec RECORD;
  cycle_rec RECORD;
  feedback_request_id UUID;
  relationship_types TEXT[] := ARRAY['senior_colleague', 'equal_colleague', 'junior_colleague'];
  start_date TIMESTAMP := NOW() - INTERVAL '30 days';
  end_date TIMESTAMP := NOW();
BEGIN
  -- For each employee
  FOR employee_rec IN (SELECT id FROM employees) LOOP
    -- Create only one feedback request per employee
    -- Create a feedback request
    INSERT INTO feedback_requests (
      id,
      review_cycle_id,
      employee_id,
      unique_link,
      status,
      created_at
    )
    SELECT
      gen_random_uuid(),
      (SELECT id FROM review_cycles ORDER BY created_at DESC LIMIT 1), -- Get most recent review cycle
      employee_rec.id,
      encode(gen_random_bytes(9), 'base64'),
      'completed',
      start_date + (random() * (end_date - start_date))
    WHERE NOT EXISTS (
      SELECT 1 FROM feedback_requests 
      WHERE employee_id = employee_rec.id 
      AND review_cycle_id = (SELECT id FROM review_cycles ORDER BY created_at DESC LIMIT 1)
    )
    RETURNING id INTO feedback_request_id;

    -- Only generate feedback if we created a new request
    IF feedback_request_id IS NOT NULL THEN
      -- Generate 3-5 feedback responses
      FOR i IN 1..floor(random() * 3 + 3) LOOP
        INSERT INTO feedback_responses (
          id,
          feedback_request_id,
          relationship,
          strengths,
          areas_for_improvement,
          overall_rating,
          submitted_at
        )
        VALUES (
          gen_random_uuid(),
          feedback_request_id,
          relationship_types[floor(random() * 3 + 1)],
          random_feedback_text('strengths'),
          random_feedback_text('improvements'),
          floor(random() * 3 + 3), -- Generates ratings between 3-5
          start_date + (random() * (end_date - start_date))
        );
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

-- Update feedback request status based on responses
UPDATE feedback_requests fr
SET status = 'completed'
WHERE (
  SELECT COUNT(*)
  FROM feedback_responses
  WHERE feedback_request_id = fr.id
) > 0; 