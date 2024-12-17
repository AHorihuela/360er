-- Create review cycles table
CREATE TABLE IF NOT EXISTS review_cycles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create feedback requests table
CREATE TABLE IF NOT EXISTS feedback_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_cycle_id UUID REFERENCES review_cycles(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  unique_link TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create feedback responses table
CREATE TABLE IF NOT EXISTS feedback_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_request_id UUID REFERENCES feedback_requests(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  strengths TEXT,
  areas_for_improvement TEXT,
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

-- Policies for review_cycles
CREATE POLICY "Users can view their created review cycles"
  ON review_cycles
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can create review cycles"
  ON review_cycles
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Policies for feedback_requests
CREATE POLICY "Users can view feedback requests for their review cycles"
  ON feedback_requests
  FOR SELECT
  TO authenticated
  USING (
    review_cycle_id IN (
      SELECT id FROM review_cycles WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create feedback requests"
  ON feedback_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    review_cycle_id IN (
      SELECT id FROM review_cycles WHERE created_by = auth.uid()
    )
  );

-- Policies for feedback_responses
CREATE POLICY "Anyone can create feedback responses"
  ON feedback_responses
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Users can view feedback responses for their review cycles"
  ON feedback_responses
  FOR SELECT
  TO authenticated
  USING (
    feedback_request_id IN (
      SELECT fr.id 
      FROM feedback_requests fr
      JOIN review_cycles rc ON fr.review_cycle_id = rc.id
      WHERE rc.created_by = auth.uid()
    )
  ); 