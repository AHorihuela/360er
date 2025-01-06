-- Create app settings schema
CREATE SCHEMA IF NOT EXISTS app_settings;

-- Create settings table
CREATE TABLE IF NOT EXISTS app_settings.config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE app_settings.config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings" ON app_settings.config
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Function to get setting
CREATE OR REPLACE FUNCTION app_settings.get_setting(p_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (SELECT value FROM app_settings.config WHERE key = p_key);
END;
$$;

-- Function to set setting
CREATE OR REPLACE FUNCTION app_settings.set_setting(p_key TEXT, p_value TEXT, p_description TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO app_settings.config (key, value, description)
    VALUES (p_key, p_value, p_description)
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        description = COALESCE(EXCLUDED.description, app_settings.config.description),
        updated_at = NOW();
END;
$$;

-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA app_settings TO authenticated;
GRANT EXECUTE ON FUNCTION app_settings.get_setting TO authenticated;
GRANT EXECUTE ON FUNCTION app_settings.set_setting TO authenticated; 