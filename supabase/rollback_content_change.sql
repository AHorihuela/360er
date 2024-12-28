-- First verify no NULL content exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM ai_reports WHERE content IS NULL) THEN
    RAISE EXCEPTION 'Cannot restore NOT NULL constraint - NULL values exist in content column';
  END IF;
END $$;

-- Restore NOT NULL constraint if safe
ALTER TABLE ai_reports ALTER COLUMN content SET NOT NULL;

-- Verify the change
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'ai_reports' 
    AND column_name = 'content' 
    AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'Failed to restore NOT NULL constraint';
  END IF;
END $$; 