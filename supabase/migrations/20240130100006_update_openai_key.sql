-- Create a function to get environment variables securely
CREATE OR REPLACE FUNCTION get_env_var(var_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This will be replaced with actual env var in production
    RETURN CASE 
        WHEN var_name = 'OPENAI_API_KEY' THEN current_setting('app.settings.openai_api_key', true)
        ELSE NULL
    END;
END;
$$;

-- Update get_service_key to use the new function
CREATE OR REPLACE FUNCTION get_service_key(service text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN CASE 
        WHEN service = 'openai' THEN get_env_var('OPENAI_API_KEY')
        ELSE NULL
    END;
END;
$$;

-- Add comment
COMMENT ON FUNCTION get_service_key(text) IS 'Securely retrieves service API keys. Currently supports: openai'; 