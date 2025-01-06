-- Update the analyze_feedback function with more logging
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
    RAISE NOTICE 'Starting analysis for request_id: %', request_id;

    -- Create a new report or get existing one
    INSERT INTO ai_reports (feedback_request_id, status)
    VALUES (request_id, 'processing')
    ON CONFLICT (feedback_request_id) 
    DO UPDATE SET status = 'processing', updated_at = NOW()
    RETURNING id INTO v_report_id;

    RAISE NOTICE 'Created/Updated report with ID: %', v_report_id;

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

    RAISE NOTICE 'Collected responses: %', v_responses;

    -- Verify we have responses to analyze
    IF v_responses IS NULL OR v_responses::text = '{"senior":[],"peer":[],"junior":[]}' THEN
        RAISE EXCEPTION 'No submitted responses found for analysis';
    END IF;

    -- Get OpenAI key
    v_openai_key := get_service_key('openai');
    IF v_openai_key IS NULL THEN
        RAISE EXCEPTION 'OpenAI API key not found';
    END IF;
    RAISE NOTICE 'Retrieved OpenAI key (first 5 chars): %', left(v_openai_key, 5);

    -- Make OpenAI API call
    BEGIN
        RAISE NOTICE 'Making OpenAI API call...';
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
        RAISE NOTICE 'OpenAI API response received: %', v_openai_response;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'OpenAI API call failed: %', SQLERRM;
        RAISE EXCEPTION 'OpenAI API call failed: %', SQLERRM;
    END;

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

    RAISE NOTICE 'Analysis completed successfully';
    RETURN v_report_id;
EXCEPTION WHEN OTHERS THEN
    -- Update report with error
    RAISE NOTICE 'Error during analysis: %', SQLERRM;
    UPDATE ai_reports 
    SET 
        status = 'error',
        error = SQLERRM,
        updated_at = NOW()
    WHERE id = v_report_id;
    
    RETURN v_report_id;
END;
$$; 