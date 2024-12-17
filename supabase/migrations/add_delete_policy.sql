-- Create policy to allow authenticated users to delete employees
CREATE POLICY "Allow authenticated users to delete employees"
  ON employees
  FOR DELETE
  TO authenticated
  USING (true); 