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
-- Views
------------------------------------------

-- Create feedback summary view
CREATE OR REPLACE VIEW review_cycles_feedback_summary AS
SELECT 
    rc.id AS review_cycle_id,
    rc.user_id,
    count(fr.id) AS total_requests,
    count(
        CASE
            WHEN (fr.status = 'completed'::text) THEN 1
            ELSE NULL::integer
        END
    ) AS completed_requests
FROM review_cycles rc
LEFT JOIN feedback_requests fr ON fr.review_cycle_id = rc.id
GROUP BY rc.id, rc.user_id;

-- Grant permissions on the view
GRANT SELECT ON review_cycles_feedback_summary TO authenticated;
GRANT SELECT ON review_cycles_feedback_summary TO anon;

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

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create updated_at triggers for all tables
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_cycles_updated_at
    BEFORE UPDATE ON review_cycles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_requests_updated_at
    BEFORE UPDATE ON feedback_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_reports_updated_at
    BEFORE UPDATE ON ai_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_page_views_updated_at
    BEFORE UPDATE ON page_views
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

------------------------------------------
-- RLS Policies
------------------------------------------

-- Employees policies
CREATE POLICY "employees_auth_select"
    ON employees FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR 
        id IN (
            SELECT employee_id FROM feedback_requests fr
            JOIN review_cycles rc ON rc.id = fr.review_cycle_id
            WHERE rc.user_id = auth.uid()
        )
    );

CREATE POLICY "employees_anon_select"
    ON employees FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM feedback_requests fr
            WHERE fr.employee_id = employees.id
            AND fr.unique_link IS NOT NULL
        )
    );

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
CREATE POLICY "review_cycles_auth_select"
    ON review_cycles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "review_cycles_anon_select"
    ON review_cycles FOR SELECT
    TO public
    USING (
        id IN (
            SELECT DISTINCT review_cycle_id
            FROM feedback_requests
            WHERE unique_link IS NOT NULL
        )
    );

CREATE POLICY "Users can create their own review cycles"
    ON review_cycles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own review cycles"
    ON review_cycles FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own review cycles"
    ON review_cycles FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Feedback requests policies
CREATE POLICY "feedback_requests_auth_select"
    ON feedback_requests FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM review_cycles
            WHERE id = review_cycle_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "feedback_requests_anon_select"
    ON feedback_requests FOR SELECT
    TO public
    USING (unique_link IS NOT NULL);

CREATE POLICY "feedback_requests_auth_update"
    ON feedback_requests FOR UPDATE
    TO authenticated
    USING (
        review_cycle_id IN (
            SELECT id FROM review_cycles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "feedback_requests_auth_delete"
    ON feedback_requests FOR DELETE
    TO authenticated
    USING (
        review_cycle_id IN (
            SELECT id FROM review_cycles
            WHERE user_id = auth.uid()
        )
    );

-- Feedback responses policies
CREATE POLICY "feedback_responses_auth_access"
    ON feedback_responses FOR ALL
    TO authenticated
    USING (
        feedback_request_id IN (
            SELECT id FROM feedback_requests
            WHERE review_cycle_id IN (
                SELECT id FROM review_cycles
                WHERE user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        feedback_request_id IN (
            SELECT id FROM feedback_requests
            WHERE review_cycle_id IN (
                SELECT id FROM review_cycles
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "feedback_responses_anon_submit"
    ON feedback_responses FOR INSERT
    TO public
    WITH CHECK (
        feedback_request_id IN (
            SELECT id FROM feedback_requests
            WHERE unique_link IS NOT NULL
            AND status <> 'closed'
            AND review_cycle_id IN (
                SELECT id FROM review_cycles
                WHERE review_by_date >= CURRENT_DATE
            )
        )
    );

CREATE POLICY "feedback_responses_anon_access"
    ON feedback_responses FOR SELECT
    TO public
    USING (
        feedback_request_id IN (
            SELECT id FROM feedback_requests
            WHERE unique_link IS NOT NULL
        )
    );

-- AI reports policies
CREATE POLICY "Anyone can view AI reports through unique link"
    ON ai_reports FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM feedback_requests fr
            WHERE fr.id = ai_reports.feedback_request_id
            AND fr.unique_link IS NOT NULL
        )
    );

CREATE POLICY "Users can view AI reports for their feedback requests"
    ON ai_reports FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM feedback_requests fr
            JOIN review_cycles rc ON fr.review_cycle_id = rc.id
            WHERE fr.id = ai_reports.feedback_request_id
            AND rc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create AI reports for their feedback requests"
    ON ai_reports FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM feedback_requests fr
            JOIN review_cycles rc ON fr.review_cycle_id = rc.id
            WHERE fr.id = ai_reports.feedback_request_id
            AND rc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own AI reports"
    ON ai_reports FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM feedback_requests fr
            JOIN review_cycles rc ON fr.review_cycle_id = rc.id
            WHERE fr.id = ai_reports.feedback_request_id
            AND rc.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM feedback_requests fr
            JOIN review_cycles rc ON fr.review_cycle_id = rc.id
            WHERE fr.id = ai_reports.feedback_request_id
            AND rc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own AI reports"
    ON ai_reports FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM feedback_requests fr
            JOIN review_cycles rc ON fr.review_cycle_id = rc.id
            WHERE fr.id = ai_reports.feedback_request_id
            AND rc.user_id = auth.uid()
        )
    );

-- Feedback analyses policies
CREATE POLICY "feedback_analyses_select_policy"
    ON feedback_analyses FOR SELECT
    TO public
    USING (true);

CREATE POLICY "feedback_analyses_insert_policy"
    ON feedback_analyses FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "auth_view_feedback_analyses"
    ON feedback_analyses FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "anon_insert_feedback_analyses"
    ON feedback_analyses FOR INSERT
    TO anon
    WITH CHECK (true);

-- Page views policies
CREATE POLICY "page_views_select_policy"
    ON page_views FOR SELECT
    TO public
    USING (true);

CREATE POLICY "page_views_insert_policy"
    ON page_views FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Anyone can create page views"
    ON page_views FOR INSERT
    TO anon
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM feedback_requests fr
            WHERE fr.id = page_views.feedback_request_id
        )
    );

------------------------------------------
-- Grants
------------------------------------------

-- Grant necessary permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant limited permissions to anonymous users
GRANT SELECT, INSERT ON feedback_responses TO anon;
GRANT SELECT ON employees TO anon;
GRANT SELECT ON review_cycles TO anon;
GRANT SELECT ON feedback_requests TO anon;
GRANT SELECT, INSERT ON feedback_analyses TO anon;
GRANT SELECT, INSERT ON page_views TO anon; 