-- Check existing triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM 
    information_schema.triggers
WHERE 
    event_object_table = 'feedback_responses'
ORDER BY 
    trigger_name; 