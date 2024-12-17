-- Drop existing policies
DROP POLICY IF EXISTS "Users can view feedback requests for their review cycles" ON feedback_requests;
DROP POLICY IF EXISTS "Users can view their created review cycles" ON review_cycles;

-- Create new policies for feedback_requests
CREATE POLICY "Anyone can view feedback requests by unique link"
ON feedback_requests
FOR SELECT
TO anon, authenticated
USING (true);  -- We'll filter by unique_link in the application code

-- Create policy for review_cycles to allow anonymous read access
CREATE POLICY "Anyone can view review cycles"
ON review_cycles
FOR SELECT
TO anon, authenticated
USING (true);

-- Update policies for feedback_responses
DROP POLICY IF EXISTS "Anyone can create feedback responses" ON feedback_responses;
CREATE POLICY "Anyone can create feedback responses"
ON feedback_responses
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Update policies for employees to allow anonymous read access
DROP POLICY IF EXISTS "Allow authenticated users to read employees" ON employees;
CREATE POLICY "Anyone can read employees"
ON employees
FOR SELECT
TO anon, authenticated
USING (true); 