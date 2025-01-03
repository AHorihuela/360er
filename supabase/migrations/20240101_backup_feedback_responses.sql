-- Create backup table with the same structure and constraints
CREATE TABLE feedback_responses_backup (LIKE feedback_responses INCLUDING ALL);

-- Efficiently copy all data using a single transaction
BEGIN;
  -- Copy data in batches to avoid memory issues
  INSERT INTO feedback_responses_backup
  SELECT * FROM feedback_responses;
  
  -- Create index on backup table for faster recovery if needed
  CREATE INDEX idx_backup_feedback_request_id ON feedback_responses_backup(feedback_request_id);
  CREATE INDEX idx_backup_session_id ON feedback_responses_backup(session_id);

  -- Save metadata about the backup
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    executed_at timestamptz DEFAULT now()
  );
  
  INSERT INTO schema_migrations (version) 
  VALUES ('20240101_add_draft_fields_backup')
  ON CONFLICT (version) DO NOTHING;
COMMIT;

-- Rollback SQL in case we need to revert:
/*
BEGIN;
  -- Drop new columns and constraints
  ALTER TABLE feedback_responses 
    DROP COLUMN IF EXISTS is_draft,
    DROP COLUMN IF EXISTS previous_version_id;
  
  -- Restore original constraint
  ALTER TABLE feedback_responses
    DROP CONSTRAINT IF EXISTS unique_feedback_per_session;
  
  ALTER TABLE feedback_responses
    ADD CONSTRAINT unique_feedback_per_session 
    UNIQUE (feedback_request_id, session_id);
  
  -- Restore original trigger
  CREATE OR REPLACE FUNCTION handle_feedback_response()
  RETURNS TRIGGER
  SECURITY DEFINER
  SET search_path = public
  LANGUAGE plpgsql
  AS $func$
  DECLARE
      v_request_status text;
      v_unique_link text;
  BEGIN
      SELECT status, unique_link
      INTO v_request_status, v_unique_link
      FROM feedback_requests fr
      WHERE id = NEW.feedback_request_id;
      
      IF v_unique_link IS NULL THEN
          RAISE EXCEPTION 'Invalid feedback request';
      END IF;
      
      IF v_request_status = 'closed' THEN
          RAISE EXCEPTION 'Feedback request is closed and no longer accepting responses';
      END IF;
      
      NEW.strengths := COALESCE(NEW.strengths, '');
      NEW.areas_for_improvement := COALESCE(NEW.areas_for_improvement, '');
      NEW.submitted_at := NOW();
      RETURN NEW;
  END;
  $func$;
COMMIT;
*/ 