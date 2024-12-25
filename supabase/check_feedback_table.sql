-- Check current table structure
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'feedback_responses'
ORDER BY ordinal_position;

-- Update column constraints
ALTER TABLE feedback_responses
ALTER COLUMN feedback_request_id SET NOT NULL,
ALTER COLUMN strengths SET NOT NULL,
ALTER COLUMN areas_for_improvement SET NOT NULL;

-- Add default values for text columns
ALTER TABLE feedback_responses
ALTER COLUMN strengths SET DEFAULT '',
ALTER COLUMN areas_for_improvement SET DEFAULT '';

-- Check table constraints
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE 
    tc.table_name = 'feedback_responses'; 