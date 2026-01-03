// ABOUTME: Global test setup for Vitest.
// ABOUTME: Provides browser API mocks (ResizeObserver, IntersectionObserver, matchMedia) and cleanup for tests.

import '@testing-library/jest-dom';
import { expect, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// Mock ResizeObserver for Radix UI components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
} as unknown as typeof IntersectionObserver;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// For integration tests, verify local Supabase is running
beforeAll(async () => {
  if (process.env.INTEGRATION_TESTS === 'true') {
    try {
      const response = await fetch('http://127.0.0.1:54321/rest/v1/', {
        headers: {
          'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
        },
      });
      if (!response.ok && response.status !== 401) {
        throw new Error('Local Supabase not running or not responding');
      }
    } catch (error) {
      console.error('\n========================================');
      console.error('ERROR: Local Supabase must be running for integration tests');
      console.error('Run: npm run supabase:start');
      console.error('========================================\n');
      process.exit(1);
    }
  }
});
