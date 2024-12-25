-- Enable RLS on views
ALTER VIEW review_cycles_with_feedback OWNER TO authenticated;
ALTER VIEW user_review_cycles OWNER TO authenticated;

-- Enable RLS
ALTER VIEW review_cycles_with_feedback SECURITY INVOKER;
ALTER VIEW user_review_cycles SECURITY INVOKER;

-- Create policies for review_cycles_with_feedback view
CREATE POLICY "Users can view their own review cycles with feedback"
ON review_cycles_with_feedback
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create policies for user_review_cycles view
CREATE POLICY "Users can view their own user review cycles"
ON user_review_cycles
FOR SELECT
TO authenticated
USING (user_id = auth.uid()); 