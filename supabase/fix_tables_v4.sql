-- Add missing columns to ai_reports
ALTER TABLE ai_reports
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS error TEXT;

-- Add missing columns to review_cycles
ALTER TABLE review_cycles
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create page_views table if it doesn't exist
CREATE TABLE IF NOT EXISTS page_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feedback_request_id UUID REFERENCES feedback_requests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT NOT NULL,
    page_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on page_views
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for page_views
CREATE POLICY "Users can view their own page views"
    ON page_views FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM feedback_requests fr
            JOIN review_cycles rc ON rc.id = fr.review_cycle_id
            WHERE fr.id = page_views.feedback_request_id
            AND rc.user_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can create page views"
    ON page_views FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_page_views_feedback_request_id ON page_views(feedback_request_id);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);

-- Now create the view with the correct structure
DROP VIEW IF EXISTS review_cycles_with_feedback;
CREATE VIEW review_cycles_with_feedback AS
SELECT 
    rc.id,
    rc.title,
    rc.status,
    rc.review_by_date,
    rc.created_at,
    rc.updated_at,
    rc.user_id,
    fr.id as feedback_request_id,
    fr.status as feedback_request_status,
    fr.target_responses,
    fr.manually_completed,
    fr.employee_id,
    fr.unique_link,
    ar.id as ai_report_id,
    ar.status as ai_report_status,
    ar.is_final,
    ar.error as ai_report_error,
    ar.content as ai_report_content,
    fres.id as feedback_response_id,
    fres.relationship,
    fres.strengths,
    fres.areas_for_improvement,
    fres.overall_rating,
    fres.submitted_at,
    pv.id as page_view_id,
    pv.session_id,
    pv.page_url,
    pv.created_at as page_view_created_at
FROM review_cycles rc
LEFT JOIN feedback_requests fr ON fr.review_cycle_id = rc.id
LEFT JOIN ai_reports ar ON ar.feedback_request_id = fr.id
LEFT JOIN feedback_responses fres ON fres.feedback_request_id = fr.id
LEFT JOIN page_views pv ON pv.feedback_request_id = fr.id;

-- Grant access to the view
GRANT SELECT ON review_cycles_with_feedback TO authenticated; 