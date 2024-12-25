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
    target_responses INTEGER DEFAULT 3,
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
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT feedback_requests_id_fkey FOREIGN KEY (feedback_request_id) REFERENCES feedback_requests(id) ON DELETE CASCADE
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

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY; 