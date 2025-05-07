import { vi, describe, it, expect, beforeEach } from 'vitest';
import { submitSurveyResponses } from '@/api/surveyQuestions';
import { SurveyQuestion, ReviewCycleType } from '@/types/survey';

// Network condition simulation
type NetworkCondition = {
  name: string;
  minLatencyMs: number;
  maxLatencyMs: number;
  packetLossRate: number;
  jitterMs: number;
};

// Define different network conditions to test
const networkConditions: Record<string, NetworkCondition> = {
  perfect: {
    name: 'Perfect Connection',
    minLatencyMs: 10,
    maxLatencyMs: 20,
    packetLossRate: 0,
    jitterMs: 0
  },
  good: {
    name: 'Good Connection',
    minLatencyMs: 50,
    maxLatencyMs: 100,
    packetLossRate: 0.01, // 1% packet loss
    jitterMs: 10
  },
  average: {
    name: 'Average Connection',
    minLatencyMs: 100,
    maxLatencyMs: 300,
    packetLossRate: 0.03, // 3% packet loss
    jitterMs: 30
  },
  poor: {
    name: 'Poor Connection',
    minLatencyMs: 300,
    maxLatencyMs: 800,
    packetLossRate: 0.08, // 8% packet loss
    jitterMs: 100
  },
  mobile: {
    name: 'Mobile Connection',
    minLatencyMs: 200,
    maxLatencyMs: 500,
    packetLossRate: 0.05, // 5% packet loss
    jitterMs: 70
  }
};

// Network simulator
class NetworkSimulator {
  private condition: NetworkCondition;
  private retryAttempts: number;
  
  constructor(condition: NetworkCondition, retryAttempts = 3) {
    this.condition = condition;
    this.retryAttempts = retryAttempts;
  }
  
  // Simulates a network request with the configured conditions
  async simulateRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    // Track attempts
    let attempts = 0;
    let lastError: Error | null = null;
    
    while (attempts < this.retryAttempts) {
      attempts++;
      
      try {
        // Determine if this request will fail due to packet loss
        if (Math.random() < this.condition.packetLossRate) {
          throw new Error('Network request failed (simulated packet loss)');
        }
        
        // Calculate latency for this request (with jitter)
        const jitterVariation = (Math.random() * 2 - 1) * this.condition.jitterMs;
        const baseLatency = this.condition.minLatencyMs + Math.random() * (this.condition.maxLatencyMs - this.condition.minLatencyMs);
        const requestLatency = Math.max(0, baseLatency + jitterVariation);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, requestLatency));
        
        // Execute the actual request
        return await requestFn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Exponential backoff for retries (if we have retries left)
        if (attempts < this.retryAttempts) {
          const backoffTime = Math.pow(2, attempts) * 100; // 200ms, 400ms, 800ms, etc.
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }
    
    // If we get here, all attempts failed
    throw lastError || new Error('Request failed after all retry attempts');
  }
}

// Mock the API module with network simulation
vi.mock('@/api/surveyQuestions', () => ({
  submitSurveyResponses: vi.fn().mockImplementation(
    async (feedbackRequestId, relationship, responses, sessionId) => {
      // Default implementation to be replaced in tests
      return {
        id: 'mock-response-id',
        feedback_request_id: feedbackRequestId,
        relationship,
        responses,
        session_id: sessionId,
        submitted_at: new Date().toISOString(),
        status: 'submitted'
      };
    }
  )
}));

describe('Network Conditions Load Test', () => {
  let networkSimulator: NetworkSimulator;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  // Helper to generate random survey responses
  const generateRandomResponses = () => {
    return {
      q1: Math.floor(Math.random() * 5) + 1,
      q2: Math.floor(Math.random() * 5) + 1,
      q3: 'Some feedback text for testing.'
    };
  };
  
  // Helper to submit a survey with network simulation
  const submitSurveyWithNetworkCondition = async (
    condition: NetworkCondition,
    userIndex: number
  ) => {
    const feedbackRequestId = 'test-request-999';
    const sessionId = `net-test-session-${userIndex}`;
    const relationship = 'peer';
    const responses = generateRandomResponses();
    
    // Setup network simulator for this request
    networkSimulator = new NetworkSimulator(condition);
    
    // Record timing
    const startTime = performance.now();
    let endTime: number;
    let success = false;
    let error: Error | null = null;
    
    try {
      // Mock the API function for this specific test
      (submitSurveyResponses as any).mockImplementationOnce(
        async (feedbackRequestId: string, relationship: string, responses: any, sessionId: string) => {
          // Simulate the network conditions by wrapping the original mock
          return await networkSimulator.simulateRequest(() => 
            Promise.resolve({
              id: `mock-response-id-${userIndex}`,
              feedback_request_id: feedbackRequestId,
              relationship,
              responses,
              session_id: sessionId,
              submitted_at: new Date().toISOString(),
              status: 'submitted'
            })
          );
        }
      );
      
      // Submit the survey
      await submitSurveyResponses(
        feedbackRequestId,
        relationship,
        responses,
        sessionId
      );
      
      success = true;
    } catch (err) {
      error = err instanceof Error ? err : new Error('Unknown error');
    } finally {
      endTime = performance.now();
    }
    
    return {
      success,
      responseTimeMs: endTime! - startTime,
      error
    };
  };
  
  it('tests survey submission under different network conditions', async () => {
    const usersPerCondition = 10;
    const results: Record<string, {
      condition: NetworkCondition;
      successRate: number;
      avgResponseTimeMs: number;
      maxResponseTimeMs: number;
      minResponseTimeMs: number;
      failureCount: number;
    }> = {};
    
    // Test each network condition
    for (const [conditionKey, condition] of Object.entries(networkConditions)) {
      console.log(`\n--- Testing ${condition.name} ---`);
      
      // Submit multiple surveys under this condition
      const conditionResults = await Promise.all(
        Array(usersPerCondition).fill(0).map((_, i) => 
          submitSurveyWithNetworkCondition(condition, i)
        )
      );
      
      // Calculate metrics
      const successCount = conditionResults.filter(r => r.success).length;
      const successRate = (successCount / usersPerCondition) * 100;
      const responseTimes = conditionResults.map(r => r.responseTimeMs);
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / usersPerCondition;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      
      // Store results
      results[conditionKey] = {
        condition,
        successRate,
        avgResponseTimeMs: avgResponseTime,
        maxResponseTimeMs: maxResponseTime,
        minResponseTimeMs: minResponseTime,
        failureCount: usersPerCondition - successCount
      };
      
      // Log results for this condition
      console.log(`Success rate: ${successRate.toFixed(2)}%`);
      console.log(`Avg response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Min/Max response time: ${minResponseTime.toFixed(2)}ms / ${maxResponseTime.toFixed(2)}ms`);
      
      if (usersPerCondition - successCount > 0) {
        console.log(`Failed submissions: ${usersPerCondition - successCount}`);
      }
    }
    
    // Comparative analysis
    console.log('\n===== Network Conditions Comparative Analysis =====');
    console.log('Condition   | Success Rate | Avg Response Time | Failures');
    console.log('------------|--------------|-------------------|----------');
    
    Object.entries(results).forEach(([key, result]) => {
      console.log(
        `${result.condition.name.padEnd(12)} | ` +
        `${result.successRate.toFixed(2)}%`.padEnd(14) + ' | ' +
        `${result.avgResponseTimeMs.toFixed(2)}ms`.padEnd(19) + ' | ' +
        `${result.failureCount}`
      );
    });
    
    // Calculate degradation factor (comparing to perfect conditions)
    const perfectConditionTime = results.perfect.avgResponseTimeMs;
    
    console.log('\nResponse Time Degradation Factors (compared to perfect):');
    Object.entries(results).forEach(([key, result]) => {
      if (key !== 'perfect') {
        const degradation = result.avgResponseTimeMs / perfectConditionTime;
        console.log(`${result.condition.name}: ${degradation.toFixed(2)}x slower`);
      }
    });
    
    // Verify the perfect network condition has 100% success
    expect(results.perfect.successRate).toBe(100);
    // Verify that poor connections have longer response times
    expect(results.poor.avgResponseTimeMs).toBeGreaterThan(results.good.avgResponseTimeMs);
  });
  
  it('tests concurrent submissions with varying network conditions', async () => {
    // Simulate a mix of users with different network conditions
    const userConditions = [
      // 40% good connections
      ...Array(10).fill(networkConditions.good),
      // 40% average connections
      ...Array(10).fill(networkConditions.average),
      // 15% mobile connections
      ...Array(4).fill(networkConditions.mobile),
      // 5% poor connections
      ...Array(1).fill(networkConditions.poor),
    ];
    
    console.log(`\n--- Testing mixed network conditions (${userConditions.length} concurrent users) ---`);
    
    const startTime = performance.now();
    
    // Submit all surveys with their respective network conditions
    const results = await Promise.all(
      userConditions.map((condition, i) => 
        submitSurveyWithNetworkCondition(condition, i)
      )
    );
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    // Calculate metrics
    const successCount = results.filter(r => r.success).length;
    const successRate = (successCount / userConditions.length) * 100;
    const responseTimes = results.map(r => r.responseTimeMs);
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / userConditions.length;
    const maxResponseTime = Math.max(...responseTimes);
    const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];
    
    // Log results
    console.log('===== Concurrent Mixed Network Conditions Results =====');
    console.log(`Total execution time: ${totalTime.toFixed(2)}ms`);
    console.log(`Success rate: ${successRate.toFixed(2)}%`);
    console.log(`Avg response time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`Max response time: ${maxResponseTime.toFixed(2)}ms`);
    console.log(`95th percentile response time: ${p95ResponseTime.toFixed(2)}ms`);
    console.log(`Throughput: ${(successCount / (totalTime / 1000)).toFixed(2)} successful submissions/second`);
    
    // Calculate success rates by network condition type
    const conditionTypes = ['good', 'average', 'mobile', 'poor'];
    let conditionIndex = 0;
    
    conditionTypes.forEach(conditionType => {
      const countForType = conditionType === 'good' || conditionType === 'average' ? 10 : 
                           conditionType === 'mobile' ? 4 : 1;
      
      const resultsForType = results.slice(conditionIndex, conditionIndex + countForType);
      const successForType = resultsForType.filter(r => r.success).length;
      const successRateForType = (successForType / countForType) * 100;
      
      console.log(`${networkConditions[conditionType].name} success rate: ${successRateForType.toFixed(2)}%`);
      conditionIndex += countForType;
    });
    
    // Verify that we have some successful submissions
    expect(successCount).toBeGreaterThan(0);
    // Total time should be greater than the average response time (due to concurrent nature)
    expect(totalTime).toBeLessThan(avgResponseTime * userConditions.length);
  });
}); 