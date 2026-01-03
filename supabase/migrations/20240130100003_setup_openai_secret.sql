-- Create a function to get the OpenAI key securely
CREATE OR REPLACE FUNCTION get_service_key(service text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- In production, this would fetch from vault.decrypted_secrets
    -- For now, we'll use a placeholder that can be replaced with the actual key
    RETURN CASE 
        WHEN service = 'openai' THEN current_setting('app.settings.openai_key', true)
        ELSE NULL
    END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_service_key(text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_service_key(text) IS 'Securely retrieves service API keys. Currently supports: openai';

-- Modify our analyze_feedback function to use this
CREATE OR REPLACE FUNCTION analyze_feedback(request_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_report_id UUID;
    v_responses JSON;
    v_openai_response JSON;
BEGIN
    -- Create a new report or get existing one
    INSERT INTO ai_reports (feedback_request_id, status)
    VALUES (request_id, 'processing')
    ON CONFLICT (feedback_request_id) 
    DO UPDATE SET status = 'processing', updated_at = NOW()
    RETURNING id INTO v_report_id;

    -- Get all responses grouped by relationship
    SELECT json_build_object(
        'senior', COALESCE(json_agg(r) FILTER (WHERE r.relationship = 'senior'), '[]'),
        'peer', COALESCE(json_agg(r) FILTER (WHERE r.relationship = 'peer'), '[]'),
        'junior', COALESCE(json_agg(r) FILTER (WHERE r.relationship = 'junior'), '[]')
    )
    FROM (
        SELECT relationship, 
               strengths, 
               areas_for_improvement, 
               overall_rating
        FROM feedback_responses
        WHERE feedback_request_id = request_id
          AND submitted_at IS NOT NULL -- Only include submitted responses
    ) r INTO v_responses;

    -- Verify we have responses to analyze
    IF v_responses IS NULL OR v_responses::text = '{"senior":[],"peer":[],"junior":[]}' THEN
        RAISE EXCEPTION 'No submitted responses found for analysis';
    END IF;

    -- Make OpenAI API call
    SELECT content FROM net.http_post(
        url := 'https://api.openai.com/v1/chat/completions',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || get_service_key('openai'),
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
                    'content', v_responses::text
                )
            ),
            'temperature', 0.7,
            'response_format', jsonb_build_object('type', 'json_object')
        )
    ) INTO v_openai_response;

    -- Verify OpenAI response
    IF v_openai_response IS NULL OR v_openai_response::text = '' THEN
        RAISE EXCEPTION 'Failed to get valid response from OpenAI';
    END IF;

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