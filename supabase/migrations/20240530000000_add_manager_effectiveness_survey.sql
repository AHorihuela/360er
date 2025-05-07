-- Migration for Manager Effectiveness Survey feature
-- Ensures backward compatibility by:
-- 1. Using defaults for new fields
-- 2. Adding rather than modifying existing fields
-- 3. Updating RLS policies appropriately

-- Add type field to review_cycles table
ALTER TABLE review_cycles 
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT '360_review' 
CHECK (type IN ('360_review', 'manager_effectiveness'));

-- Add comment for clarity
COMMENT ON COLUMN review_cycles.type IS 'Type of review cycle: 360_review or manager_effectiveness';

-- Create survey_questions table
CREATE TABLE IF NOT EXISTS survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_cycle_type TEXT NOT NULL CHECK (review_cycle_type IN ('360_review', 'manager_effectiveness')),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('likert', 'open_ended', 'multiple_choice')),
  options JSONB,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Add comment
COMMENT ON TABLE survey_questions IS 'Stores questions for different types of surveys';

-- Add responses JSONB field to feedback_responses
ALTER TABLE feedback_responses
ADD COLUMN IF NOT EXISTS responses JSONB DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN feedback_responses.responses IS 'Structured responses for survey questions (JSONB format)';

-- Create index for performance on feedback_responses.responses
CREATE INDEX IF NOT EXISTS idx_feedback_responses_jsonb ON feedback_responses USING GIN (responses);

-- Create index for survey_questions by type for faster lookups
CREATE INDEX IF NOT EXISTS idx_survey_questions_type ON survey_questions(review_cycle_type);
CREATE INDEX IF NOT EXISTS idx_survey_questions_order ON survey_questions(review_cycle_type, "order");

-- Enable RLS on survey_questions
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for survey_questions
CREATE POLICY "Anyone can read survey questions" 
ON survey_questions FOR SELECT 
TO PUBLIC 
USING (true);

-- Only allow authenticated users to insert
CREATE POLICY "Only authenticated users can insert survey questions" 
ON survey_questions FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Only allow authenticated users to update
CREATE POLICY "Only authenticated users can update survey questions" 
ON survey_questions FOR UPDATE 
TO authenticated 
USING (true);

-- Seed the default Manager Effectiveness Survey questions
INSERT INTO survey_questions (review_cycle_type, question_text, question_type, options, "order")
VALUES
  -- Manager Effectiveness Survey Likert questions
  (
    'manager_effectiveness',
    'I understand what is expected of me at work.',
    'likert',
    '[
      {"value": 1, "label": "Strongly Disagree"},
      {"value": 2, "label": "Disagree"},
      {"value": 3, "label": "Neither agree nor disagree"},
      {"value": 4, "label": "Agree"},
      {"value": 5, "label": "Strongly Agree"}
    ]',
    1
  ),
  (
    'manager_effectiveness',
    'My manager contributes to my productivity.',
    'likert',
    '[
      {"value": 1, "label": "Strongly Disagree"},
      {"value": 2, "label": "Disagree"},
      {"value": 3, "label": "Neither agree nor disagree"},
      {"value": 4, "label": "Agree"},
      {"value": 5, "label": "Strongly Agree"}
    ]',
    2
  ),
  (
    'manager_effectiveness',
    'My manager frequently provides feedback that helps me improve my performance.',
    'likert',
    '[
      {"value": 1, "label": "Strongly Disagree"},
      {"value": 2, "label": "Disagree"},
      {"value": 3, "label": "Neither agree nor disagree"},
      {"value": 4, "label": "Agree"},
      {"value": 5, "label": "Strongly Agree"}
    ]',
    3
  ),
  (
    'manager_effectiveness',
    'My manager effectively directs our people and resources toward our most important priorities.',
    'likert',
    '[
      {"value": 1, "label": "Strongly Disagree"},
      {"value": 2, "label": "Disagree"},
      {"value": 3, "label": "Neither agree nor disagree"},
      {"value": 4, "label": "Agree"},
      {"value": 5, "label": "Strongly Agree"}
    ]',
    4
  ),
  (
    'manager_effectiveness',
    'My manager effectively balances doing work, delegating work, coaching, and influencing others.',
    'likert',
    '[
      {"value": 1, "label": "Strongly Disagree"},
      {"value": 2, "label": "Disagree"},
      {"value": 3, "label": "Neither agree nor disagree"},
      {"value": 4, "label": "Agree"},
      {"value": 5, "label": "Strongly Agree"}
    ]',
    5
  ),
  (
    'manager_effectiveness',
    'My manager actively supports my career growth and development.',
    'likert',
    '[
      {"value": 1, "label": "Strongly Disagree"},
      {"value": 2, "label": "Disagree"},
      {"value": 3, "label": "Neither agree nor disagree"},
      {"value": 4, "label": "Agree"},
      {"value": 5, "label": "Strongly Agree"}
    ]',
    6
  ),
  (
    'manager_effectiveness',
    'My manager values my opinions and gives me the opportunity to contribute ideas to help our department achieve its goals.',
    'likert',
    '[
      {"value": 1, "label": "Strongly Disagree"},
      {"value": 2, "label": "Disagree"},
      {"value": 3, "label": "Neither agree nor disagree"},
      {"value": 4, "label": "Agree"},
      {"value": 5, "label": "Strongly Agree"}
    ]',
    7
  ),
  
  -- Manager Effectiveness Survey open-ended questions
  (
    'manager_effectiveness',
    'What could this manager do to better support the team''s success and development?',
    'open_ended',
    NULL,
    8
  ),
  (
    'manager_effectiveness',
    'What is one suggestion or improvement that this manager could do that would improve your overall experience?',
    'open_ended',
    NULL,
    9
  ),
  (
    'manager_effectiveness',
    'Is there any additional feedback you would like to share?',
    'open_ended',
    NULL,
    10
  ),
  
  -- Default 360 Review Questions (to maintain the same structure)
  (
    '360_review',
    'What are this person''s strengths?',
    'open_ended',
    NULL,
    1
  ),
  (
    '360_review',
    'What are areas for improvement for this person?',
    'open_ended',
    NULL,
    2
  )
ON CONFLICT DO NOTHING;

-- Update grants
GRANT SELECT ON survey_questions TO public;
GRANT INSERT, UPDATE ON survey_questions TO authenticated; 