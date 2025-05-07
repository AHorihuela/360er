#!/bin/bash

# Script to apply Manager Effectiveness Survey migrations

echo "Applying Manager Effectiveness Survey migrations..."

# Get Supabase connection string from environment or use a default
if [ -z "$SUPABASE_CONNECTION_STRING" ]; then
  echo "Warning: SUPABASE_CONNECTION_STRING not set. Using default Supabase URL."
  CONNECTION_STRING="postgres://postgres:postgres@localhost:54322/postgres"
else
  CONNECTION_STRING="$SUPABASE_CONNECTION_STRING"
fi

# Path to the migration file
MIGRATION_FILE="supabase/migrations/20240530000000_add_manager_effectiveness_survey.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "Error: Migration file not found at $MIGRATION_FILE"
  exit 1
fi

# Run the migration
echo "Running migration: $MIGRATION_FILE"
psql "$CONNECTION_STRING" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
  echo "Migration completed successfully."
  
  # Add the migration to the migrations table
  psql "$CONNECTION_STRING" -c "INSERT INTO supabase_migrations.schema_migrations (version, statements) VALUES ('20240530000000', 'Manager Effectiveness Survey migration') ON CONFLICT DO NOTHING;"
  
  echo "Migration recorded in schema_migrations table."
else
  echo "Error: Migration failed."
  exit 1
fi

echo "Done!"
exit 0 