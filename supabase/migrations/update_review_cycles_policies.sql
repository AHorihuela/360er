-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create review cycles" ON review_cycles;

-- Create new policy for inserting review cycles
CREATE POLICY "Users can create review cycles"
ON review_cycles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Update the select policy to be more permissive
DROP POLICY IF EXISTS "Users can view their created review cycles" ON review_cycles;
CREATE POLICY "Users can view review cycles"
ON review_cycles
FOR SELECT
TO authenticated
USING (true); 