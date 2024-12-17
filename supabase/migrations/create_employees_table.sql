-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read all employees
CREATE POLICY "Allow authenticated users to read employees"
  ON employees
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow authenticated users to insert employees
CREATE POLICY "Allow authenticated users to insert employees"
  ON employees
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy to allow authenticated users to update their own employees
CREATE POLICY "Allow authenticated users to update employees"
  ON employees
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true); 