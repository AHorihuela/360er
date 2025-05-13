-- 1. List all tables and views in the database
SELECT 
    table_name,
    table_type
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
ORDER BY 
    table_type, table_name;

-- 2. List tables with 'backup', 'deprecated', or 'temp' in the name
SELECT 
    table_name,
    table_type
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
    AND (
        table_name LIKE '%backup%' OR
        table_name LIKE '%deprecated%' OR
        table_name LIKE '%temp%' OR
        table_name LIKE '%old%' OR
        table_name LIKE '%policy_%'
    )
ORDER BY 
    table_name;

-- 3. Check columns in feedback_analytics table
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'feedback_analytics'
ORDER BY 
    ordinal_position;

-- 4. Check columns in feedback_analyses table
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'feedback_analyses'
ORDER BY 
    ordinal_position;

-- 5. Check foreign key relationships
SELECT
    tc.table_name AS table_with_foreign_key,
    kcu.column_name AS fk_column,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column
FROM
    information_schema.table_constraints tc
JOIN
    information_schema.key_column_usage kcu ON
        tc.constraint_name = kcu.constraint_name AND
        tc.table_schema = kcu.table_schema
JOIN
    information_schema.constraint_column_usage ccu ON
        ccu.constraint_name = tc.constraint_name AND
        ccu.table_schema = tc.table_schema
WHERE
    tc.constraint_type = 'FOREIGN KEY' AND
    tc.table_schema = 'public'
ORDER BY
    tc.table_name, kcu.column_name;

-- 6. Find tables not referenced by any foreign keys
SELECT DISTINCT
    t.table_name
FROM
    information_schema.tables t
LEFT JOIN (
    SELECT DISTINCT ccu.table_name
    FROM
        information_schema.constraint_column_usage ccu
    JOIN
        information_schema.table_constraints tc ON
            tc.constraint_name = ccu.constraint_name AND
            tc.constraint_type = 'FOREIGN KEY'
    WHERE
        tc.table_schema = 'public' AND
        ccu.table_schema = 'public'
) ref ON t.table_name = ref.table_name
WHERE
    t.table_schema = 'public' AND
    t.table_type = 'BASE TABLE' AND
    ref.table_name IS NULL
ORDER BY
    t.table_name; 