-- Add created_by column if it doesn't exist
ALTER TABLE review_cycles
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Set created_by in the insert trigger
CREATE OR REPLACE FUNCTION set_review_cycle_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS set_review_cycle_created_by_trigger ON review_cycles;
CREATE TRIGGER set_review_cycle_created_by_trigger
  BEFORE INSERT ON review_cycles
  FOR EACH ROW
  EXECUTE FUNCTION set_review_cycle_created_by(); 