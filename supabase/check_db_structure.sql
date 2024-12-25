-- Check all tables and their columns
WITH table_columns AS (
    SELECT 
        t.table_name,
        array_agg(
            c.column_name || ' ' || c.data_type || 
            CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
            CASE WHEN c.column_default IS NOT NULL THEN ' DEFAULT ' || c.column_default ELSE '' END
            ORDER BY c.ordinal_position
        ) as columns
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public'
    GROUP BY t.table_name
),
foreign_keys AS (
    SELECT 
        tc.table_name,
        array_agg(
            kcu.column_name || ' -> ' || 
            ccu.table_name || '.' || ccu.column_name || 
            ' (' || tc.constraint_name || ')'
            ORDER BY kcu.ordinal_position
        ) as foreign_keys
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    GROUP BY tc.table_name
),
indexes AS (
    SELECT 
        tablename as table_name,
        array_agg(indexname || ' ON (' || indexdef || ')') as indexes
    FROM pg_indexes
    WHERE schemaname = 'public'
    GROUP BY tablename
)
SELECT 
    tc.table_name,
    tc.columns as "Columns",
    COALESCE(fk.foreign_keys, ARRAY[]::text[]) as "Foreign Keys",
    COALESCE(i.indexes, ARRAY[]::text[]) as "Indexes"
FROM table_columns tc
LEFT JOIN foreign_keys fk ON tc.table_name = fk.table_name
LEFT JOIN indexes i ON tc.table_name = i.table_name
ORDER BY tc.table_name; 