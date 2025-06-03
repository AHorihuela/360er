-- Drop existing function if it exists
DROP FUNCTION IF EXISTS analyze_feedback_with_openai;

CREATE OR REPLACE FUNCTION analyze_feedback_with_openai(
  p_feedback_request_id UUID,
  p_responses JSONB,
  p_openai_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_openai_response JSONB;
  v_analysis JSONB;
BEGIN
  -- Validate OpenAI key
  IF p_openai_key IS NULL OR p_openai_key = '' THEN
    RAISE EXCEPTION 'OpenAI API key not provided';
  END IF;

  -- Make OpenAI API call
  SELECT content::jsonb INTO v_openai_response
  FROM net.http_post(
    url := 'https://api.openai.com/v1/chat/completions',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || p_openai_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
              'model', 'gpt-4o',
      'messages', json_build_array(
        jsonb_build_object(
          'role', 'system',
          'content', 'You are an expert in analyzing 360-degree feedback. Analyze the provided feedback responses and generate insights about: 1. Common themes 2. Specific perspectives from different levels 3. Key strengths and areas for improvement 4. Action items. Structure your response as a JSON object with these sections: aggregate (overall analysis), senior (feedback from senior colleagues), peer (feedback from peers), junior (feedback from junior colleagues)'
        ),
        jsonb_build_object(
          'role', 'user',
          'content', p_responses::text
        )
      ),
      'temperature', 0.7,
      'response_format', jsonb_build_object('type', 'json_object')
    )
  );

  -- Extract the analysis from the response
  v_analysis := v_openai_response->'choices'->0->'message'->'content';

  -- Store the analysis
  INSERT INTO feedback_analytics (
    feedback_request_id,
    insights,
    feedback_hash,
    last_analyzed_at
  )
  VALUES (
    p_feedback_request_id,
    v_analysis,
    md5(p_responses::text),
    now()
  )
  ON CONFLICT (feedback_request_id) 
  DO UPDATE SET
    insights = v_analysis,
    feedback_hash = md5(p_responses::text),
    last_analyzed_at = now();

  RETURN v_analysis;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION analyze_feedback_with_openai TO authenticated;

-- Create policy for feedback_analytics table
CREATE POLICY analyze_feedback_policy ON feedback_analytics
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id 
    FROM feedback_requests 
    WHERE id = feedback_request_id
  )); 