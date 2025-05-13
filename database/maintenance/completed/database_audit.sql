-- 1. List all tables and views in the database
SELECT 
    t.table_schema,
    t.table_name,
    t.table_type,
    d.description as table_comment
FROM 
    information_schema.tables t
LEFT JOIN 
    pg_catalog.pg_class c ON c.relname = t.table_name
LEFT JOIN 
    pg_catalog.pg_description d ON d.objoid = c.oid AND d.objsubid = 0
WHERE 
    t.table_schema = 'public'
ORDER BY 
    t.table_type, t.table_name;

-- 2. Count rows in each table to identify empty or near-empty tables
-- This query needs to be run with dynamic SQL or separately for each table
-- Here's a simpler version that just lists the tables
SELECT 
    table_name
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY 
    table_name;

-- 3. Check for tables with 'backup', 'deprecated', or 'temp' in the name
SELECT 
    table_name
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

-- 4. Check for potentially redundant tables by comparing column structure
SELECT
    t1.table_name AS table1,
    t2.table_name AS table2,
    COUNT(c1.column_name) AS matching_columns,
    t1_cols.column_count AS table1_columns,
    t2_cols.column_count AS table2_columns
FROM
    information_schema.tables t1
JOIN
    information_schema.tables t2 ON t1.table_name < t2.table_name
JOIN
    information_schema.columns c1 ON 
        c1.table_schema = t1.table_schema AND 
        c1.table_name = t1.table_name
JOIN
    information_schema.columns c2 ON 
        c2.table_schema = t2.table_schema AND 
        c2.table_name = t2.table_name AND
        c1.column_name = c2.column_name AND
        c1.data_type = c2.data_type
JOIN (
    SELECT table_name, COUNT(*) AS column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    GROUP BY table_name
) t1_cols ON t1_cols.table_name = t1.table_name
JOIN (
    SELECT table_name, COUNT(*) AS column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    GROUP BY table_name
) t2_cols ON t2_cols.table_name = t2.table_name
WHERE
    t1.table_schema = 'public' AND
    t2.table_schema = 'public' AND
    t1.table_type = 'BASE TABLE' AND
    t2.table_type = 'BASE TABLE'
GROUP BY
    t1.table_name, t2.table_name, t1_cols.column_count, t2_cols.column_count
HAVING
    COUNT(c1.column_name) >= 3
ORDER BY
    matching_columns DESC;

-- 5. Check for tables with foreign key references to them
-- This helps identify which tables are actively used in relationships
SELECT
    ccu.table_name AS referenced_table,
    COUNT(DISTINCT tc.table_name) AS referencing_tables_count,
    string_agg(DISTINCT tc.table_name, ', ') AS referencing_tables
FROM
    information_schema.table_constraints tc
JOIN
    information_schema.constraint_column_usage ccu ON 
        ccu.constraint_schema = tc.constraint_schema AND
        ccu.constraint_name = tc.constraint_name
WHERE
    tc.constraint_type = 'FOREIGN KEY' AND
    tc.table_schema = 'public' AND
    ccu.table_schema = 'public'
GROUP BY
    ccu.table_name
ORDER BY
    referencing_tables_count DESC;

-- 6. Check for tables not referenced by any foreign keys
-- These might be standalone or potentially redundant tables
SELECT
    t.table_name
FROM
    information_schema.tables t
LEFT JOIN (
    SELECT DISTINCT ccu.table_name
    FROM
        information_schema.table_constraints tc
    JOIN
        information_schema.constraint_column_usage ccu ON 
            ccu.constraint_schema = tc.constraint_schema AND
            ccu.constraint_name = tc.constraint_name
    WHERE
        tc.constraint_type = 'FOREIGN KEY' AND
        tc.table_schema = 'public' AND
        ccu.table_schema = 'public'
) ref ON t.table_name = ref.table_name
WHERE
    t.table_schema = 'public' AND
    t.table_type = 'BASE TABLE' AND
    ref.table_name IS NULL
ORDER BY
    t.table_name;

-- 7. Compare feedback_analytics and feedback_analyses tables to check for redundancy
SELECT
    'feedback_analytics' AS table_name,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM
    information_schema.columns
WHERE
    table_schema = 'public' AND
    table_name = 'feedback_analytics'

UNION ALL

SELECT
    'feedback_analyses' AS table_name,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM
    information_schema.columns
WHERE
    table_schema = 'public' AND
    table_name = 'feedback_analyses'
ORDER BY
    column_name, table_name; 