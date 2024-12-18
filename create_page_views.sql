-- Create page_views table
CREATE TABLE page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_request_id UUID REFERENCES feedback_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  page_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating updated_at
CREATE TRIGGER update_page_views_updated_at
  BEFORE UPDATE ON page_views
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own page views"
  ON page_views FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own page views"
  ON page_views FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Public can insert page views for feedback requests"
  ON page_views FOR INSERT
  TO anon
  WITH CHECK (feedback_request_id IS NOT NULL);

-- Create index for performance
CREATE INDEX idx_page_views_user_id ON page_views(user_id);
CREATE INDEX idx_page_views_feedback_request_id ON page_views(feedback_request_id);
CREATE INDEX idx_page_views_created_at ON page_views(created_at); 