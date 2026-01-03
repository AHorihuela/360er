-- Update the get_service_key function to use app_settings
CREATE OR REPLACE FUNCTION get_service_key(service text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN CASE 
        WHEN service = 'openai' THEN app_settings.get_setting('openai_key')
        ELSE NULL
    END;
END;
$$;

-- Add comment
COMMENT ON FUNCTION get_service_key(text) IS 'Securely retrieves service API keys. Currently supports: openai';

-- Insert OpenAI key placeholder (to be replaced in production)
SELECT app_settings.set_setting(
    'openai_key',
    'sk-placeholder', -- This will be replaced with the real key in production
    'OpenAI API key for feedback analysis'
); 