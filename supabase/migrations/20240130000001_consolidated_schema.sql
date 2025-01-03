-- Consolidated migration file for Squad360
-- Combines base tables, policies, triggers, and latest fixes

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

------------------------------------------
-- Base Tables
------------------------------------------

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create review cycles table
CREATE TABLE IF NOT EXISTS review_cycles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    review_by_date DATE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create feedback requests table
CREATE TABLE IF NOT EXISTS feedback_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    review_cycle_id UUID,
    employee_id UUID,
    unique_link TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    target_responses INTEGER DEFAULT 10,
    manually_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT review_cycles_id_fkey FOREIGN KEY (review_cycle_id) REFERENCES review_cycles(id) ON DELETE CASCADE,
    CONSTRAINT employees_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Create feedback responses table
CREATE TABLE IF NOT EXISTS feedback_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feedback_request_id UUID,
    relationship TEXT NOT NULL,
    strengths TEXT,
    areas_for_improvement TEXT,
    session_id UUID DEFAULT gen_random_uuid(),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT feedback_requests_id_fkey FOREIGN KEY (feedback_request_id) REFERENCES feedback_requests(id) ON DELETE CASCADE,
    CONSTRAINT unique_feedback_per_session UNIQUE (feedback_request_id, session_id)
);

-- Create AI reports table
CREATE TABLE IF NOT EXISTS ai_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feedback_request_id UUID,
    status TEXT NOT NULL DEFAULT 'pending',
    is_final BOOLEAN DEFAULT false,
    error TEXT,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT ai_reports_feedback_request_id_fkey FOREIGN KEY (feedback_request_id) REFERENCES feedback_requests(id) ON DELETE CASCADE
);

-- Create feedback analyses table
CREATE TABLE IF NOT EXISTS feedback_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feedback_request_id UUID REFERENCES feedback_requests(id) ON DELETE CASCADE,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create page views table
CREATE TABLE IF NOT EXISTS page_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feedback_request_id UUID REFERENCES feedback_requests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    page_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------
-- Enable RLS
------------------------------------------
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

------------------------------------------
-- Triggers
------------------------------------------

-- Feedback response handler
CREATE OR REPLACE FUNCTION handle_feedback_response()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_request_status text;
    v_unique_link text;
BEGIN
    -- Get request info
    SELECT 
        status,
        unique_link
    INTO v_request_status, v_unique_link
    FROM feedback_requests fr
    WHERE id = NEW.feedback_request_id;
    
    -- Check if request exists and has unique link
    IF v_unique_link IS NULL THEN
        RAISE EXCEPTION 'Invalid feedback request';
    END IF;
    
    -- Check if request is still pending (not closed)
    IF v_request_status = 'closed' THEN
        RAISE EXCEPTION 'Feedback request is closed and no longer accepting responses';
    END IF;
    
    -- Set default values for text fields
    NEW.strengths := COALESCE(NEW.strengths, '');
    NEW.areas_for_improvement := COALESCE(NEW.areas_for_improvement, '');
    NEW.submitted_at := NOW();

    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER handle_feedback_response
    BEFORE INSERT ON feedback_responses
    FOR EACH ROW
    EXECUTE FUNCTION handle_feedback_response();

-- Page views updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_page_views_updated_at
    BEFORE UPDATE ON page_views
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

------------------------------------------
-- RLS Policies
------------------------------------------

-- Employees policies
CREATE POLICY "Users can view their own employees"
    ON employees FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own employees"
    ON employees FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own employees"
    ON employees FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own employees"
    ON employees FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Review cycles policies
CREATE POLICY "Users can view their own review cycles"
    ON review_cycles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own review cycles"
    ON review_cycles FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own review cycles"
    ON review_cycles FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own review cycles"
    ON review_cycles FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Feedback requests policies
CREATE POLICY "Users can view their own feedback requests"
    ON feedback_requests FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM review_cycles rc
            WHERE rc.id = review_cycle_id
            AND rc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert feedback requests for their cycles"
    ON feedback_requests FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM review_cycles rc
            WHERE rc.id = review_cycle_id
            AND rc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own feedback requests"
    ON feedback_requests FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM review_cycles rc
            WHERE rc.id = review_cycle_id
            AND rc.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM review_cycles rc
            WHERE rc.id = review_cycle_id
            AND rc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own feedback requests"
    ON feedback_requests FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM review_cycles rc
            WHERE rc.id = review_cycle_id
            AND rc.user_id = auth.uid()
        )
    );

-- Anonymous feedback submission policies
CREATE POLICY "Allow anonymous feedback request viewing"
    ON feedback_requests FOR SELECT
    TO public
    USING (unique_link IS NOT NULL);

CREATE POLICY "Allow anonymous feedback submission"
    ON feedback_responses FOR INSERT
    TO public
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM feedback_requests fr
            WHERE fr.id = feedback_request_id
            AND fr.unique_link IS NOT NULL
            AND fr.status != 'closed'
            AND EXISTS (
                SELECT 1 FROM review_cycles rc
                WHERE rc.id = fr.review_cycle_id
                AND rc.review_by_date >= CURRENT_DATE
            )
        )
    );

-- AI reports policies
CREATE POLICY "Users can view their own AI reports"
    ON ai_reports FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM feedback_requests fr
            JOIN review_cycles rc ON rc.id = fr.review_cycle_id
            WHERE fr.id = feedback_request_id
            AND rc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own AI reports"
    ON ai_reports FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM feedback_requests fr
            JOIN review_cycles rc ON rc.id = fr.review_cycle_id
            WHERE fr.id = feedback_request_id
            AND rc.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM feedback_requests fr
            JOIN review_cycles rc ON rc.id = fr.review_cycle_id
            WHERE fr.id = feedback_request_id
            AND rc.user_id = auth.uid()
        )
    );

-- Feedback analyses policies
CREATE POLICY "Users can view their own feedback analyses"
    ON feedback_analyses FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM feedback_requests fr
            JOIN review_cycles rc ON rc.id = fr.review_cycle_id
            WHERE fr.id = feedback_request_id
            AND rc.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow anonymous feedback analyses creation"
    ON feedback_analyses FOR INSERT
    TO public
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM feedback_requests fr
            WHERE fr.id = feedback_request_id
            AND fr.unique_link IS NOT NULL
            AND fr.status != 'closed'
        )
    );

-- Page views policies
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
    TO public
    WITH CHECK (feedback_request_id IS NOT NULL);

------------------------------------------
-- Indexes
------------------------------------------

-- Page views indexes
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_feedback_request_id ON page_views(feedback_request_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);

------------------------------------------
-- Permissions
------------------------------------------

-- Schema usage
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Table permissions for authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- Table permissions for anonymous users
GRANT SELECT ON feedback_requests TO anon;
GRANT INSERT ON feedback_responses TO anon;
GRANT INSERT ON feedback_analyses TO anon;

-- Additional permissions for page views
GRANT INSERT ON page_views TO anon; 