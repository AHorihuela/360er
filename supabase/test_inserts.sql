-- First, let's try a direct insert without the trigger
DROP TRIGGER IF EXISTS handle_feedback_response ON feedback_responses;

-- Test insert without trigger
DO $$
BEGIN
    RAISE NOTICE 'Testing insert without trigger...';
    INSERT INTO feedback_responses (
        feedback_request_id,
        relationship,
        strengths,
        areas_for_improvement
    ) VALUES (
        '92fbee65-ff81-4d70-8c32-45a0c3ed7218',
        'equal_colleague',
        'test strengths',
        'test improvements'
    );
    RAISE NOTICE 'Insert without trigger successful';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Insert without trigger failed: %', SQLERRM;
END $$;

-- Now recreate the trigger with more debug info
CREATE OR REPLACE FUNCTION handle_feedback_response()
RETURNS TRIGGER AS $$
DECLARE
    debug_info jsonb;
BEGIN
    debug_info := jsonb_build_object(
        'trigger_name', TG_NAME,
        'table_name', TG_TABLE_NAME,
        'operation', TG_OP,
        'new_data', to_jsonb(NEW)
    );
    
    RAISE LOG 'Trigger debug info: %', debug_info;
    
    -- Set timestamps
    NEW.submitted_at := NOW();
    NEW.created_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_feedback_response
    BEFORE INSERT ON feedback_responses
    FOR EACH ROW
    EXECUTE FUNCTION handle_feedback_response();

-- Test insert with trigger
DO $$
BEGIN
    RAISE NOTICE 'Testing insert with trigger...';
    INSERT INTO feedback_responses (
        feedback_request_id,
        relationship,
        strengths,
        areas_for_improvement
    ) VALUES (
        '92fbee65-ff81-4d70-8c32-45a0c3ed7218',
        'equal_colleague',
        'test strengths',
        'test improvements'
    );
    RAISE NOTICE 'Insert with trigger successful';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Insert with trigger failed: %', SQLERRM;
END $$;

-- Test insert with prepared statement
DO $$
BEGIN
    RAISE NOTICE 'Testing prepared statement...';
    PREPARE feedback_insert AS
    INSERT INTO feedback_responses (
        feedback_request_id,
        relationship,
        strengths,
        areas_for_improvement
    ) VALUES ($1, $2, $3, $4);
    
    EXECUTE feedback_insert(
        '92fbee65-ff81-4d70-8c32-45a0c3ed7218',
        'equal_colleague',
        'test strengths',
        'test improvements'
    );
    RAISE NOTICE 'Prepared statement successful';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Prepared statement failed: %', SQLERRM;
END $$;

-- Verify the inserts
SELECT 
    id,
    feedback_request_id,
    relationship,
    strengths,
    areas_for_improvement,
    submitted_at,
    created_at
FROM 
    feedback_responses
WHERE 
    feedback_request_id = '92fbee65-ff81-4d70-8c32-45a0c3ed7218'
ORDER BY 
    created_at DESC
LIMIT 5; 