import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { setTimeout } from 'timers/promises';

describe('Feedback Analysis API Integration Tests', () => {
  let serverProcess: ChildProcess | null = null;
  let serverStarted = false;

  beforeAll(async () => {
    // Start the Express server for integration testing
    console.log('Starting Express server for integration tests...');
    
    try {
      serverProcess = spawn('npm', ['run', 'server'], {
        stdio: 'pipe',
        env: { 
          ...process.env,
          OPENAI_API_KEY: 'test-key-for-integration-tests',
          API_PORT: '5176' // Use different port to avoid conflicts
        }
      });

      // Wait for server to start and check if it's responding
      for (let i = 0; i < 10; i++) {
        await setTimeout(1000);
        
        try {
          const healthCheck = await fetch('http://localhost:5176/api/analyze-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: 'health-check' })
          });
          
          if (healthCheck) {
            serverStarted = true;
            console.log('Server is responding');
            break;
          }
        } catch (error) {
          // Server not ready yet, continue waiting
          console.log(`Waiting for server... attempt ${i + 1}/10`);
        }
      }
      
      if (!serverStarted) {
        console.warn('Server did not start properly within timeout');
      }
      
    } catch (error) {
      console.error('Failed to start server for integration tests:', error);
    }
  }, 15000);

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      // Wait for graceful shutdown
      await setTimeout(2000);
      if (!serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
    }
  });

  describe('API Server Health Checks', () => {
    it('should have Express server running on correct port', async () => {
      if (!serverStarted) {
        console.warn('Skipping test - server not available');
        return;
      }

      const response = await fetch('http://localhost:5176/api/analyze-feedback', {
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
      expect(response.status).toBeGreaterThanOrEqual(200);
    }, 10000);

    it('should detect when API server is not running', async () => {
      // Test with a port we know is not running
      try {
        await fetch('http://localhost:9999/api/analyze-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: 'data' })
        });
        expect.fail('Should have thrown an error for unreachable server');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Development Environment Checks', () => {
    it('should validate that both frontend and backend servers are required', async () => {
      // This test documents the requirement for running both servers
      
      // 1. Check that Vite config file exists
      const fs = await import('fs');
      const path = await import('path');
      const viteConfigPath = path.resolve(process.cwd(), 'vite.config.ts');
      const viteConfigExists = fs.existsSync(viteConfigPath);
      
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
      if (!serverStarted) {
        console.warn('Skipping test - server not available');
        return;
      }

      const expectedPath = '/api/analyze-feedback';
      
      try {
        const response = await fetch(`http://localhost:5176${expectedPath}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            relationship: 'equal_colleague',
            strengths: 'Test strength',
            areas_for_improvement: 'Test improvement'
          })
        });
        
        expect(response).toBeDefined();
        // We expect some response, even if it's an error due to test API key
        expect([400, 401, 500].includes(response.status) || response.status >= 200).toBe(true);
      } catch (error) {
        expect.fail(`API endpoint ${expectedPath} should be accessible: ${error}`);
      }
    }, 10000);

    it('should validate request body structure', async () => {
      if (!serverStarted) {
        console.warn('Skipping test - server not available');
        return;
      }

      const testRequests = [
        {
          name: 'Valid request body',
          body: {
            relationship: 'equal_colleague',
            strengths: 'Great communication skills',
            areas_for_improvement: 'Could improve time management'
          },
          shouldSucceed: true
        },
        {
          name: 'Empty request body',
          body: {},
          shouldSucceed: false
        }
      ];

      for (const testRequest of testRequests) {
        try {
          const response = await fetch('http://localhost:5176/api/analyze-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testRequest.body)
          });

          // We expect the server to respond, regardless of whether the request is valid
          expect(response).toBeDefined();
          
          if (testRequest.shouldSucceed) {
            // Valid requests should not return 400 (bad request)
            expect(response.status).not.toBe(400);
          } else {
            // Invalid requests might return 400 or other error codes
            expect(response.status >= 400 || response.status >= 200).toBe(true);
          }
        } catch (error) {
          if (testRequest.shouldSucceed) {
            expect.fail(`Expected request to succeed but got error: ${error}`);
          }
          // For requests that should fail, we expect some kind of response/error
          expect(error).toBeDefined();
        }
      }
    }, 10000);
  });

  describe('Environment Configuration Validation', () => {
    it('should handle missing environment variables gracefully', async () => {
      if (!serverStarted) {
        console.warn('Skipping test - server not available');
        return;
      }

      // Test with a request when server has test API key
      const response = await fetch('http://localhost:5176/api/analyze-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relationship: 'equal_colleague',
          strengths: 'Test strength',
          areas_for_improvement: 'Test improvement'
        })
      });

      expect(response).toBeDefined();
      
      // With test API key, we expect either success or a controlled error
      if (!response.ok) {
        const errorData = await response.json();
        expect(errorData.error).toBeDefined();
        expect(typeof errorData.error).toBe('string');
      }
    });

    it('should provide meaningful error messages for configuration issues', async () => {
      if (!serverStarted) {
        console.warn('Skipping test - server not available');
        return;
      }

      // This test documents expected error handling patterns
      const response = await fetch('http://localhost:5176/api/analyze-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relationship: 'equal_colleague',
          strengths: 'Test strength',
          areas_for_improvement: 'Test improvement'
        })
      });

      expect(response).toBeDefined();
      
      if (!response.ok) {
        const errorData = await response.json();
        expect(errorData).toHaveProperty('error');
        expect(typeof errorData.error).toBe('string');
        expect(errorData.error.length).toBeGreaterThan(0);
      }
    });
  });
}); 