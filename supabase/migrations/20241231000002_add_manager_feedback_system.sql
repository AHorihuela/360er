-- Migration: Add Manager-to-Employee Feedback System  
-- Date: December 31, 2024
-- Purpose: Complete the feedback ecosystem by extending existing tables
-- 
-- This migration extends the current review system to support:
-- 1. Manager-to-employee feedback using existing review_cycles/feedback_requests pattern
-- 2. Continuous feedback collection with on-demand report generation
-- 3. Time-period based reporting using existing ai_reports infrastructure

------------------------------------------
-- Extend Existing Tables
------------------------------------------

-- 1. Add 'manager_to_employee' to review_cycles.type enum
-- This allows manager feedback to use the same review cycle infrastructure
-- Note: Architecture supports future expansion to 'peer_to_peer' type for colleague feedback
ALTER TABLE review_cycles 
DROP CONSTRAINT IF EXISTS review_cycles_type_check;

ALTER TABLE review_cycles 
ADD CONSTRAINT review_cycles_type_check 
CHECK (type IN ('360_review', 'manager_effectiveness', 'manager_to_employee'));

-- 2. Make feedback_requests.unique_link nullable for manager feedback
-- Manager feedback doesn't need anonymous links since it's direct manager-to-employee
ALTER TABLE feedback_requests 
ALTER COLUMN unique_link DROP NOT NULL;

-- 3. Add source tracking to feedback_responses for input method
-- Supports web, voice, and future Slack integration
ALTER TABLE feedback_responses 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web' 
CHECK (source IN ('web', 'slack', 'voice'));

-- 4. Add category field to feedback_responses for AI categorization
-- Allows AI to categorize feedback (performance, communication, etc.)
ALTER TABLE feedback_responses 
ADD COLUMN IF NOT EXISTS category TEXT;

-- 5. Add time period fields to ai_reports for multiple reports per feedback_request
-- Enables generating reports for different time periods (weekly, monthly, quarterly)
ALTER TABLE ai_reports 
ADD COLUMN IF NOT EXISTS report_period_start DATE,
ADD COLUMN IF NOT EXISTS report_period_end DATE,
ADD COLUMN IF NOT EXISTS time_range_preset TEXT 
CHECK (time_range_preset IN ('last_week', 'last_month', 'last_quarter', 'custom')),
ADD COLUMN IF NOT EXISTS report_purpose TEXT,
ADD COLUMN IF NOT EXISTS feedback_count INTEGER DEFAULT 0;

------------------------------------------
-- Performance Indexes
------------------------------------------

-- Optimize feedback_responses for time-based queries (needed for report generation)
CREATE INDEX IF NOT EXISTS idx_feedback_responses_submitted_at ON feedback_responses(submitted_at);

-- Optimize feedback_responses for category filtering
CREATE INDEX IF NOT EXISTS idx_feedback_responses_category ON feedback_responses(category);

-- Optimize ai_reports for time period queries  
CREATE INDEX IF NOT EXISTS idx_ai_reports_period ON ai_reports(report_period_start, report_period_end);

------------------------------------------
-- Comments for Documentation
------------------------------------------

-- Document the new review type
COMMENT ON CONSTRAINT review_cycles_type_check ON review_cycles IS 
'Review cycle types: 360_review (peer feedback), manager_effectiveness (upward feedback), manager_to_employee (continuous manager feedback)';

-- Document nullable unique_link
COMMENT ON COLUMN feedback_requests.unique_link IS 
'Anonymous feedback link - required for 360/manager effectiveness reviews, NULL for manager-to-employee feedback';

-- Document new feedback_responses fields
COMMENT ON COLUMN feedback_responses.source IS 
'Input method: web interface, Slack integration, or voice recording';

COMMENT ON COLUMN feedback_responses.category IS 
'AI-assigned category (e.g., performance, communication, leadership)';

COMMENT ON COLUMN feedback_responses.relationship IS 
'Feedback source relationship: manager (direct feedback), peer/colleague (future peer-to-peer expansion), etc.';

-- Document ai_reports time period fields
COMMENT ON COLUMN ai_reports.report_period_start IS 
'Start date for feedback included in this report (manager-selected)';

COMMENT ON COLUMN ai_reports.report_period_end IS 
'End date for feedback included in this report (manager-selected)';

COMMENT ON COLUMN ai_reports.time_range_preset IS 
'Quick selection preset used to generate this report';

COMMENT ON COLUMN ai_reports.report_purpose IS 
'Report context (e.g., "Weekly 1:1", "Quarterly Review")';

COMMENT ON COLUMN ai_reports.feedback_count IS 
'Number of feedback entries included in this report';

------------------------------------------
-- Migration Validation
------------------------------------------

-- Verify all changes were applied successfully
DO $$
BEGIN
    -- Check that new review type is supported
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'review_cycles_type_check' 
        AND check_clause LIKE '%manager_to_employee%'
    ) THEN
        RAISE EXCEPTION 'manager_to_employee type not added to review_cycles';
    END IF;
    
    -- Check that unique_link is now nullable
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feedback_requests' 
        AND column_name = 'unique_link' 
        AND is_nullable = 'NO'
    ) THEN
        RAISE EXCEPTION 'feedback_requests.unique_link is still NOT NULL';
    END IF;
    
    -- Check that new feedback_responses columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feedback_responses' 
        AND column_name = 'source'
    ) THEN
        RAISE EXCEPTION 'feedback_responses.source column not created';
    END IF;
    
    -- Check that new ai_reports columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_reports' 
        AND column_name = 'report_period_start'
    ) THEN
        RAISE EXCEPTION 'ai_reports.report_period_start column not created';
    END IF;
    
    RAISE NOTICE 'Manager-to-employee feedback system migration completed successfully';
    RAISE NOTICE 'System now supports all three review types using existing infrastructure';
END
$$; 