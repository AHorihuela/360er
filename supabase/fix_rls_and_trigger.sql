-- First, drop all existing policies
DROP POLICY IF EXISTS "Anyone can submit feedback responses" ON feedback_responses;
DROP POLICY IF EXISTS "Anyone can view feedback requests by unique_link" ON feedback_requests;
DROP POLICY IF EXISTS "Anyone can view employees" ON employees;
DROP POLICY IF EXISTS "Anyone can view review cycles" ON review_cycles;

-- Drop existing triggers
DROP TRIGGER IF EXISTS handle_feedback_response ON feedback_responses;
DROP FUNCTION IF EXISTS handle_feedback_response();

-- Create a simpler trigger function
CREATE OR REPLACE FUNCTION handle_feedback_response()
RETURNS TRIGGER AS $$
BEGIN
    -- Just set the timestamp and return
    NEW.submitted_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER handle_feedback_response
    BEFORE INSERT ON feedback_responses
    FOR EACH ROW
    EXECUTE FUNCTION handle_feedback_response();

-- Create minimal RLS policies
CREATE POLICY "Anyone can submit feedback responses"
ON feedback_responses
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Anyone can view feedback requests"
ON feedback_requests
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anyone can view employees"
ON employees
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anyone can view review cycles"
ON review_cycles
FOR SELECT
TO anon
USING (true);

-- Grant minimal permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON feedback_requests TO anon;
GRANT SELECT ON employees TO anon;
GRANT SELECT ON review_cycles TO anon;
GRANT INSERT ON feedback_responses TO anon;

-- Create a separate function to update status
CREATE OR REPLACE FUNCTION update_feedback_request_status(request_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE feedback_requests fr
    SET status = CASE 
        WHEN (
            SELECT COUNT(*) 
            FROM feedback_responses fres 
            WHERE fres.feedback_request_id = fr.id
        ) >= COALESCE(fr.target_responses, 3) THEN 'completed'
        ELSE 'pending'
    END
    WHERE fr.id = request_id;
END;
$$ LANGUAGE plpgsql;

-- Update all feedback request statuses
SELECT update_feedback_request_status(id) FROM feedback_requests;

-- Verify the setup
SELECT 
    fr.id,
    fr.status as current_status,
    fr.target_responses,
    COUNT(fres.id) as response_count,
    array_agg(fres.submitted_at ORDER BY fres.submitted_at) as submission_dates
FROM 
    feedback_requests fr
    LEFT JOIN feedback_responses fres ON fr.id = fres.feedback_request_id
WHERE 
    fr.id = '92fbee65-ff81-4d70-8c32-45a0c3ed7218'
GROUP BY 
    fr.id,
    fr.status,
    fr.target_responses; 