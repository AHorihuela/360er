-- Migration: Fix Manager-to-Employee Due Date Constraint
-- Date: January 17, 2025
-- Purpose: Make review_by_date nullable for manager-to-employee cycles
-- 
-- Manager-to-employee cycles should be continuous without fixed due dates,
-- unlike 360_review and manager_effectiveness cycles which have deadlines

-- Make review_by_date nullable to support continuous M2E cycles
ALTER TABLE review_cycles 
ALTER COLUMN review_by_date DROP NOT NULL;

-- Add check constraint to ensure due dates are required for non-M2E cycles
-- but optional for manager_to_employee cycles
ALTER TABLE review_cycles 
DROP CONSTRAINT IF EXISTS review_cycles_due_date_check;

ALTER TABLE review_cycles 
ADD CONSTRAINT review_cycles_due_date_check 
CHECK (
  (type = 'manager_to_employee') OR 
  (type IN ('360_review', 'manager_effectiveness') AND review_by_date IS NOT NULL)
);

-- Update existing M2E cycles to remove their due dates (set to NULL)
UPDATE review_cycles 
SET review_by_date = NULL 
WHERE type = 'manager_to_employee';

-- Add comment explaining the constraint logic
COMMENT ON CONSTRAINT review_cycles_due_date_check ON review_cycles IS 
'Due dates are required for 360_review and manager_effectiveness cycles but optional for continuous manager_to_employee cycles'; 