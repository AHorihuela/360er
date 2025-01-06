-- Add unique constraint if not exists
ALTER TABLE ai_reports DROP CONSTRAINT IF EXISTS ai_reports_feedback_request_id_key;
ALTER TABLE ai_reports ADD CONSTRAINT ai_reports_feedback_request_id_key UNIQUE (feedback_request_id);

-- Create or replace the function
CREATE OR REPLACE FUNCTION analyze_feedback(request_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_report_id UUID;
    v_responses JSON;
    v_openai_response JSON;
    v_openai_key TEXT;
BEGIN
    -- Create a new report or get existing one
    INSERT INTO ai_reports (feedback_request_id, status)
    VALUES (request_id, 'processing')
    ON CONFLICT (feedback_request_id) 
    DO UPDATE SET status = 'processing', updated_at = NOW()
    RETURNING id INTO v_report_id;

    -- Get all responses grouped by relationship
    SELECT json_build_object(
        'senior', json_agg(r) FILTER (WHERE r.relationship = 'senior'),
        'peer', json_agg(r) FILTER (WHERE r.relationship = 'peer'),
        'junior', json_agg(r) FILTER (WHERE r.relationship = 'junior')
    )
    FROM (
        SELECT relationship, strengths, areas_for_improvement, overall_rating
        FROM feedback_responses
        WHERE feedback_request_id = request_id
    ) r INTO v_responses;

    -- Get OpenAI key from vault
    SELECT decrypted_secret FROM vault.decrypted_secrets 
    WHERE name = 'openai_key' 
    INTO v_openai_key;

    -- Make OpenAI API call
    SELECT content FROM net.http_post(
        url := 'https://api.openai.com/v1/chat/completions',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || v_openai_key,
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
            'model', 'gpt-4',
            'messages', json_build_array(
                jsonb_build_object(
                    'role', 'system',
                    'content', 'You are an expert in analyzing 360-degree feedback. Analyze the provided feedback responses and generate insights about: 1. Common themes 2. Specific perspectives from different levels 3. Key strengths and areas for improvement 4. Action items'
                ),
                jsonb_build_object(
                    'role', 'user',
                    'content', v_responses::text
                )
            ),
            'temperature', 0.7,
            'response_format', jsonb_build_object('type', 'json_object')
        )
    ) INTO v_openai_response;

    -- Update report with results
    UPDATE ai_reports 
    SET 
        content = v_openai_response::text,
        status = 'completed',
        updated_at = NOW()
    WHERE id = v_report_id;

    RETURN v_report_id;
EXCEPTION WHEN OTHERS THEN
    -- Update report with error
    UPDATE ai_reports 
    SET 
        status = 'error',
        error = SQLERRM,
        updated_at = NOW()
    WHERE id = v_report_id;
    
    RETURN v_report_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION analyze_feedback(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION analyze_feedback(UUID) IS 'Analyzes feedback responses for a given request ID using OpenAI and stores results in ai_reports table'; 