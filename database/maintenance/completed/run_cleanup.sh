#!/bin/bash

# Database Maintenance: Run Cleanup Scripts
# =========================================================
# 
# Date: June 2024
# Purpose: Run the database cleanup scripts in the correct order
# 
# This script runs the database cleanup scripts in the correct order:
# 1. 1_rename_before_cleanup.sql - Renames potentially redundant tables
# 2. Test application thoroughly for at least a week
# 3a. 2_rollback.sql - If issues are found, run this to restore original table names
# 3b. 3_final_cleanup.sql - If no issues are found, run this to permanently remove tables
#
# Usage:
#   ./run_cleanup.sh rename     # Run step 1 (rename tables)
#   ./run_cleanup.sh rollback   # Run step 3a (rollback if issues found)
#   ./run_cleanup.sh cleanup    # Run step 3b (final cleanup)
#   ./run_cleanup.sh verify     # Run verification after cleanup

# Configuration
SUPABASE_URL="https://vwckinhujlyviulpmtjo.supabase.co"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check for required command
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 [rename|rollback|cleanup|verify]"
  exit 1
fi

# Function to run SQL file
run_sql_file() {
  local file="$1"
  local description="$2"
  
  echo "Running $description..."
  echo "File: $file"
  
  # Use the Supabase CLI if available
  if command -v supabase &> /dev/null; then
    supabase db execute --file "$file"
  else
    # Fallback to psql if credentials are set
    if [ -n "$PGUSER" ] && [ -n "$PGPASSWORD" ] && [ -n "$PGHOST" ]; then
      PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -U "$PGUSER" -d postgres -f "$file"
    else
      echo "Error: Supabase CLI not found and database credentials not set."
      echo "Please install Supabase CLI or set PGUSER, PGPASSWORD, and PGHOST environment variables."
      exit 1
    fi
  fi
  
  echo "Completed $description"
  echo
}

# Run the appropriate script
case "$1" in
  rename)
    run_sql_file "$SCRIPT_DIR/1_rename_before_cleanup.sql" "Step 1: Rename Tables"
    echo "Tables renamed successfully. Please test the application thoroughly for at least a week."
    echo "If issues are found, run './run_cleanup.sh rollback'"
    echo "If no issues are found after testing, run './run_cleanup.sh cleanup'"
    ;;
    
  rollback)
    run_sql_file "$SCRIPT_DIR/2_rollback.sql" "Step 3a: Rollback Renamed Tables"
    echo "Tables restored to original names."
    ;;
    
  cleanup)
    run_sql_file "$SCRIPT_DIR/3_final_cleanup.sql" "Step 3b: Final Cleanup"
    echo "Redundant tables permanently removed."
    echo "Run './run_cleanup.sh verify' to verify cleanup was successful."
    ;;
    
  verify)
    run_sql_file "$SCRIPT_DIR/verify_cleanup.sql" "Verification"
    echo "Verification complete. Check results above."
    ;;
    
  *)
    echo "Invalid command: $1"
    echo "Usage: $0 [rename|rollback|cleanup|verify]"
    exit 1
    ;;
esac

exit 0 