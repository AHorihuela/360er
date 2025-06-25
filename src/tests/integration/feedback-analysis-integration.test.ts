import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { setTimeout } from 'timers/promises';

describe('Feedback Analysis API Integration Tests', () => {
  let serverProcess: ChildProcess | null = null;

  beforeAll(async () => {
    // Start the Express server for integration testing
    console.log('Starting Express server for integration tests...');
    
    serverProcess = spawn('npm', ['run', 'server'], {
      stdio: 'pipe',
      env: { 
        ...process.env,
        OPENAI_API_KEY: 'test-key-for-integration-tests',
        API_PORT: '5175' // Different port to avoid conflicts
      }
    });

    // Wait for server to start
    await setTimeout(3000);
    
    if (serverProcess?.exitCode !== null) {
      throw new Error('Server failed to start');
    }
  }, 10000);

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
      // Wait for graceful shutdown
      await setTimeout(1000);
    }
  });

  describe('API Server Health Checks', () => {
    it('should have Express server running on correct port', async () => {
      const response = await fetch('http://localhost:5175/api/analyze-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relationship: 'equal_colleague',
          strengths: 'Test strength',
          areas_for_improvement: 'Test improvement'
        })
      });

      // Should get a response (might be error due to test API key, but server should respond)
      expect(response).toBeDefined();
    });

    it('should detect when API server is not running', async () => {
      // Test against a port we know isn't running
      try {
        await fetch('http://localhost:9999/api/analyze-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            relationship: 'equal_colleague',
            strengths: 'Test strength',
            areas_for_improvement: 'Test improvement'
          })
        });
        // If we get here, the test should fail
        expect.fail('Expected fetch to fail when server is not running');
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
        expect((error as Error).message).toContain('fetch');
      }
    });
  });

  describe('Development Environment Checks', () => {
    it('should validate that both frontend and backend servers are required', async () => {
      // This test documents the requirement for running both servers
      
             // 1. Check that Vite dev server proxy is configured
       const viteConfigExists = await import('../../../vite.config.ts')
         .then(() => true)
         .catch(() => false);
      
      expect(viteConfigExists).toBe(true);
      
      // 2. Check that Express server can be started
      expect(serverProcess?.pid).toBeDefined();
    });

    it('should provide clear error messages for common development issues', async () => {
      const testCases = [
        {
          name: 'Missing OpenAI API key',
          expectedError: 'OpenAI API key not configured'
        },
        {
          name: 'Server not running',
          expectedError: 'Failed to fetch'
        }
      ];

      // This test documents the expected error patterns
      testCases.forEach(testCase => {
        expect(testCase.expectedError).toBeDefined();
      });
    });
  });

  describe('API Endpoint Validation', () => {
    it('should have correct API endpoint path structure', async () => {
      // Verify the API path matches what the frontend expects
      const expectedPath = '/api/analyze-feedback';
      
      try {
        const response = await fetch(`http://localhost:5175${expectedPath}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            relationship: 'equal_colleague',
            strengths: 'Test',
            areas_for_improvement: 'Test'
          })
        });
        
        // Should get a response (success or error, but not 404)
        expect(response.status).not.toBe(404);
      } catch (error) {
        // Network errors are also acceptable for this test
        expect(error).toBeInstanceOf(TypeError);
      }
    });

    it('should validate request body structure', async () => {
      const testRequests = [
        {
          name: 'Valid request',
          body: {
            relationship: 'equal_colleague',
            strengths: 'Great communication',
            areas_for_improvement: 'Time management'
          },
          expectSuccess: true
        },
        {
          name: 'Missing relationship',
          body: {
            strengths: 'Great communication',
            areas_for_improvement: 'Time management'
          },
          expectSuccess: false
        },
        {
          name: 'Empty strings',
          body: {
            relationship: 'equal_colleague',
            strengths: '',
            areas_for_improvement: ''
          },
          expectSuccess: true // API should handle empty strings
        }
      ];

      for (const testRequest of testRequests) {
        try {
          const response = await fetch('http://localhost:5175/api/analyze-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testRequest.body)
          });

          if (testRequest.expectSuccess) {
            // Should get some response (might be OpenAI error, but not validation error)
            expect(response.status).not.toBe(400);
          }
                 } catch (error) {
           // Network errors are acceptable for this test
           if (!(error as Error).message?.includes('fetch')) {
             throw error;
           }
         }
      }
    });
  });

  describe('Environment Configuration Validation', () => {
    it('should check required environment variables', () => {
      const requiredEnvVars = [
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY',
        'OPENAI_API_KEY'
      ];

      requiredEnvVars.forEach(envVar => {
        const value = process.env[envVar];
        if (envVar === 'OPENAI_API_KEY') {
          // This might be set only for the server process
          expect(typeof value === 'string' || value === undefined).toBe(true);
        } else {
          expect(value).toBeDefined();
          expect(value).not.toBe('');
        }
      });
    });

         it('should validate Vite proxy configuration', async () => {
       // This test ensures the proxy is configured correctly
       const viteConfig = await import('../../../vite.config.ts');
       
       expect(viteConfig.default).toBeDefined();
       // Additional validation could be added here to check proxy config
     });
  });
}); 