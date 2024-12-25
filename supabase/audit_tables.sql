-- Check feedback_responses table structure
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable,
    character_maximum_length
FROM 
    information_schema.columns 
WHERE 
    table_name = 'feedback_responses'
ORDER BY 
    ordinal_position;

-- Check feedback_requests table structure
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable,
    character_maximum_length
FROM 
    information_schema.columns 
WHERE 
    table_name = 'feedback_requests'
ORDER BY 
    ordinal_position;

-- Check all foreign key constraints
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE 
    tc.constraint_type = 'FOREIGN KEY' AND
    tc.table_name IN ('feedback_responses', 'feedback_requests');

-- Check all triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM 
    information_schema.triggers
WHERE 
    event_object_table IN ('feedback_responses', 'feedback_requests')
ORDER BY 
    trigger_name;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies
WHERE 
    tablename IN ('feedback_responses', 'feedback_requests');

-- Check table ownership and privileges
SELECT 
    grantee, table_name, privilege_type
FROM 
    information_schema.role_table_grants
WHERE 
    table_name IN ('feedback_responses', 'feedback_requests');

-- Check if any triggers are disabled
SELECT 
    t.tgname as trigger_name,
    t.tgenabled as trigger_enabled,
    c.relname as table_name
FROM 
    pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
WHERE 
    c.relname IN ('feedback_responses', 'feedback_requests');

-- Check sequence ownership and privileges
SELECT 
    sequence_name,
    data_type,
    start_value,
    minimum_value,
    maximum_value,
    increment
FROM 
    information_schema.sequences
WHERE 
    sequence_schema = 'public';

-- Check for any custom types used
SELECT 
    t.typname as type_name,
    t.typtype as type_type,
    t.typcategory as type_category
FROM 
    pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE 
    n.nspname = 'public'
    AND t.typtype = 'e'; 