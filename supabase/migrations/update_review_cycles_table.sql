-- Drop existing columns
ALTER TABLE review_cycles
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS start_date,
DROP COLUMN IF EXISTS end_date;

-- Add new column
ALTER TABLE review_cycles
ADD COLUMN IF NOT EXISTS review_by_date date NOT NULL;

-- Update existing rows (if any) with a default value
UPDATE review_cycles
SET review_by_date = CURRENT_DATE + INTERVAL '30 days'
WHERE review_by_date IS NULL; 