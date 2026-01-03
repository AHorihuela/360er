// ABOUTME: Supabase client for integration tests using local database.
// ABOUTME: Provides test clients with anon and service role access plus data utilities.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Local Supabase default credentials (from supabase start)
const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
const LOCAL_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const LOCAL_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Test client with anon role (for testing RLS)
export const testSupabase: SupabaseClient = createClient(
  LOCAL_SUPABASE_URL,
  LOCAL_ANON_KEY
);

// Test client with service role (bypasses RLS, for setup/teardown)
export const testSupabaseAdmin: SupabaseClient = createClient(
  LOCAL_SUPABASE_URL,
  LOCAL_SERVICE_ROLE_KEY
);

/**
 * Reset test data by deleting all records from test tables
 * Uses service role to bypass RLS
 * Delete in reverse dependency order to avoid FK constraint violations
 */
export async function resetTestData(): Promise<void> {
  const tables = [
    'page_views',
    'feedback_analytics',
    'ai_reports',
    'feedback_responses',
    'feedback_requests',
    'review_cycles',
    'employees',
  ];

  for (const table of tables) {
    const { error } = await testSupabaseAdmin
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Match all records

    if (error) {
      console.error(`Error clearing ${table}:`, error);
    }
  }
}

/**
 * Seed test data with minimal records for testing
 * Returns IDs of created records for use in tests
 */
export async function seedTestData(): Promise<{
  employeeId: string;
  cycleId: string;
  requestId: string;
}> {
  const employeeId = 'test1111-1111-1111-1111-111111111111';
  const cycleId = 'test2222-2222-2222-2222-222222222222';
  const requestId = 'test3333-3333-3333-3333-333333333333';

  // Create employee
  const { error: employeeError } = await testSupabaseAdmin.from('employees').upsert({
    id: employeeId,
    name: 'Test Employee',
    role: 'Software Engineer',
    user_id: null,
  });
  if (employeeError) {
    throw new Error(`Failed to seed employee: ${employeeError.message}`);
  }

  // Create review cycle
  const { error: cycleError } = await testSupabaseAdmin.from('review_cycles').upsert({
    id: cycleId,
    title: 'Test Review Cycle',
    status: 'active',
    review_by_date: '2025-12-31',
    user_id: null,
  });
  if (cycleError) {
    throw new Error(`Failed to seed review cycle: ${cycleError.message}`);
  }

  // Create feedback request
  const timestamp = new Date().getTime();
  const { error: requestError } = await testSupabaseAdmin.from('feedback_requests').upsert({
    id: requestId,
    review_cycle_id: cycleId,
    employee_id: employeeId,
    unique_link: `test-link-${timestamp}`,
    status: 'pending',
    target_responses: 5,
  });
  if (requestError) {
    throw new Error(`Failed to seed feedback request: ${requestError.message}`);
  }

  return { employeeId, cycleId, requestId };
}

/**
 * Create a test user and return their session
 * Useful for testing authenticated endpoints
 */
export async function createTestUser(email: string, password: string): Promise<{
  userId: string;
  session: unknown;
}> {
  const { data, error } = await testSupabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  // Sign in to get session
  const { data: signInData, error: signInError } = await testSupabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    throw new Error(`Failed to sign in test user: ${signInError.message}`);
  }

  return {
    userId: data.user.id,
    session: signInData.session,
  };
}

/**
 * Delete a test user
 */
export async function deleteTestUser(userId: string): Promise<void> {
  const { error } = await testSupabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    console.error(`Failed to delete test user: ${error.message}`);
  }
}
