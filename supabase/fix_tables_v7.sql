-- Begin transaction
BEGIN;

-- Check if we have any reports in processing state
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM ai_reports WHERE status = 'processing') THEN
    RAISE EXCEPTION 'Cannot modify content constraint - reports exist in processing state';
  END IF;
END $$;

-- Fix content column in ai_reports to allow NULL
ALTER TABLE ai_reports ALTER COLUMN content DROP NOT NULL;

-- Verify the change
DO $$ 
BEGIN
  -- Check if content column allows NULL
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'ai_reports' 
    AND column_name = 'content' 
    AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'content column still has NOT NULL constraint';
  END IF;
END $$;

-- Add trigger to prevent NULL content on completed reports
CREATE OR REPLACE FUNCTION check_ai_report_content()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.content IS NULL THEN
    RAISE EXCEPTION 'Completed reports must have content';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_completed_has_content ON ai_reports;
CREATE TRIGGER ensure_completed_has_content
  BEFORE INSERT OR UPDATE ON ai_reports
  FOR EACH ROW
  EXECUTE FUNCTION check_ai_report_content();

COMMIT; 