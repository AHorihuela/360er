-- Create feedback_analyses table
CREATE TABLE feedback_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  strengths TEXT NOT NULL,
  areas_for_improvement TEXT NOT NULL,
  analysis JSONB NOT NULL,
  model_version TEXT NOT NULL,
  prompt_version TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE feedback_analyses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous users to create analyses
CREATE POLICY "anon_insert_feedback_analyses"
ON feedback_analyses
FOR INSERT
TO anon
WITH CHECK (true);

-- Create policy to allow authenticated users to view analyses
CREATE POLICY "auth_view_feedback_analyses"
ON feedback_analyses
FOR SELECT
TO authenticated
USING (true); 