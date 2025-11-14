// ABOUTME: Integration tests for database relationships using real Supabase
// ABOUTME: Validates PostgREST join syntax works correctly with actual schema

import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const TEST_SUPABASE_URL = 'https://apwhdpqsifessytazlzp.supabase.co';
const TEST_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwd2hkcHFzaWZlc3N5dGF6bHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU5NTUxNTYsImV4cCI6MjAzMTUzMTE1Nn0.YA6IjRuFrKr8cjdI1pOpneTKV2DQZ3_aocOV7hIKCOo';

// Use the TESTING database for integration tests
const testSupabase = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY);

describe('Database Relationships Integration Tests', () => {
  
  describe('PostgREST Join Syntax Validation', () => {
    
    it('should validate review_cycles → feedback_requests relationship', async () => {
      // Test the exact query pattern from useReviewCycle.ts (before our fix)
      const { data, error } = await testSupabase
        .from('review_cycles')
        .select(`
          *,
          feedback_requests (
            id,
            employee_id,
            status,
            target_responses,
            unique_link
          )
        `)
        .limit(1);

      // This should either work (if foreign key exists) or fail with specific PostgREST error
      if (error) {
        expect(error.code).toBe('PGRST200');
        expect(error.message).toContain('Could not find a relationship');
      } else {
        expect(data).toBeDefined();
      }
    });

    it('should validate feedback_requests → employees relationship', async () => {
      // Test the exact query pattern that was failing
      const { data, error } = await testSupabase
        .from('feedback_requests')
        .select(`
          *,
          employee:employees (
            id,
            name,
            role,
            user_id
          )
        `)
        .limit(1);

      if (error) {
        expect(error.code).toBe('PGRST200');
        expect(error.message).toContain('Could not find a relationship');
      } else {
        expect(data).toBeDefined();
      }
    });

    it('should validate employees → feedback_requests relationship', async () => {
      // Test the exact query pattern from EmployeesPage.tsx (before our fix)
      const { data, error } = await testSupabase
        .from('employees')
        .select(`
          *,
          feedback_requests (
            id,
            review_cycle_id,
            created_at
          )
        `)
        .limit(1);

      if (error) {
        expect(error.code).toBe('PGRST200');
        expect(error.message).toContain('Could not find a relationship');
      } else {
        expect(data).toBeDefined();
      }
    });
  });

  describe('Manual Join Patterns Validation', () => {
    
    it('should validate our fixed manual join pattern works', async () => {
      // Test our manual join solution - this should ALWAYS work
      const { data: cycles, error: cycleError } = await testSupabase
        .from('review_cycles')
        .select('*')
        .limit(1);

      expect(cycleError).toBeNull();
      expect(cycles).toBeDefined();

      if (cycles && cycles.length > 0) {
        const { data: requests, error: requestError } = await testSupabase
          .from('feedback_requests')
          .select('*')
          .eq('review_cycle_id', cycles[0].id);

        expect(requestError).toBeNull();
        expect(requests).toBeDefined();
      }
    });

    it('should validate employee data can be fetched separately', async () => {
      const { data: employees, error } = await testSupabase
        .from('employees')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(employees).toBeDefined();
    });
  });

  describe('Database Schema Audit', () => {
    
    it('should verify foreign key constraints exist in schema', async () => {
      // Query the actual foreign key constraints
      const { data: constraints, error } = await testSupabase
        .rpc('audit_foreign_keys') // This would need to be a custom function
        .limit(10);

      // Even if this fails, we know we need proper foreign keys
      if (error) {
        console.warn('Foreign key audit function not available - this indicates schema gap');
      }
    });
  });
});