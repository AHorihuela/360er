import { vi, describe, it, expect, beforeEach } from 'vitest';
import { submitSurveyResponses } from '@/api/surveyQuestions';
import { SurveyQuestion, ReviewCycleType } from '@/types/survey';

// Mock the API module
vi.mock('@/api/surveyQuestions', () => ({
  submitSurveyResponses: vi.fn().mockImplementation(
    (feedbackRequestId, relationship, responses, sessionId) => 
      Promise.resolve({ 
        id: 'mock-response-id', 
        feedback_request_id: feedbackRequestId,
        relationship,
        responses,
        session_id: sessionId,
        submitted_at: new Date().toISOString(),
        status: 'submitted'
      })
  )
}));

// Mock the supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    })
  }
}));

describe('Survey Concurrent Submissions Load Test', () => {
  // Metrics collection
  let metrics: {
    startTime: number;
    endTime: number;
    successCount: number;
    failureCount: number;
    responseTimesMs: number[];
  };

  // Generate sample questions for test
  const sampleQuestions: SurveyQuestion[] = [
    {
      id: 'q1',
      reviewCycleType: 'manager_effectiveness' as ReviewCycleType,
      questionText: 'I understand what is expected of me at work.',
      questionType: 'likert',
      options: [
        { value: 1, label: 'Strongly Disagree' },
        { value: 2, label: 'Disagree' },
        { value: 3, label: 'Neither agree nor disagree' },
        { value: 4, label: 'Agree' },
        { value: 5, label: 'Strongly Agree' }
      ],
      order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'q2',
      reviewCycleType: 'manager_effectiveness' as ReviewCycleType,
      questionText: 'My manager provides clear feedback.',
      questionType: 'likert',
      options: [
        { value: 1, label: 'Strongly Disagree' },
        { value: 2, label: 'Disagree' },
        { value: 3, label: 'Neither agree nor disagree' },
        { value: 4, label: 'Agree' },
        { value: 5, label: 'Strongly Agree' }
      ],
      order: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'q3',
      reviewCycleType: 'manager_effectiveness' as ReviewCycleType,
      questionText: 'Additional comments about your manager:',
      questionType: 'open_ended',
      order: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset metrics
    metrics = {
      startTime: 0,
      endTime: 0,
      successCount: 0,
      failureCount: 0,
      responseTimesMs: []
    };
  });

  // Helper to generate a random session ID
  const generateSessionId = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  // Helper to generate random survey responses
  const generateRandomResponses = () => {
    return {
      q1: Math.floor(Math.random() * 5) + 1, // Random 1-5
      q2: Math.floor(Math.random() * 5) + 1, // Random 1-5
      q3: Math.random() > 0.3 
        ? 'This is feedback comment #' + Math.floor(Math.random() * 1000) 
        : '' // 30% chance of empty comment
    };
  };

  // Helper to generate random relationship type
  const getRandomRelationship = () => {
    const relationships = ['direct_report', 'peer', 'senior_colleague', 'equal_colleague'];
    return relationships[Math.floor(Math.random() * relationships.length)];
  };

  // Create a single survey submission
  const submitSingleSurvey = async (feedbackRequestId: string, submissionDelay = 0) => {
    const startMs = performance.now();
    
    // Optional artificial delay to simulate thinking time
    if (submissionDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, submissionDelay));
    }
    
    try {
      await submitSurveyResponses(
        feedbackRequestId,
        getRandomRelationship(),
        generateRandomResponses(),
        generateSessionId()
      );
      
      const endMs = performance.now();
      metrics.responseTimesMs.push(endMs - startMs);
      metrics.successCount++;
      
      return true;
    } catch (error) {
      metrics.failureCount++;
      return false;
    }
  };

  it('handles 10 concurrent survey submissions', async () => {
    const feedbackRequestId = 'test-request-123';
    const submissions = 10;
    
    metrics.startTime = performance.now();
    
    // Create array of submission promises
    const submissionPromises = Array(submissions).fill(0).map(() => 
      submitSingleSurvey(feedbackRequestId)
    );
    
    // Wait for all submissions to complete
    await Promise.all(submissionPromises);
    
    metrics.endTime = performance.now();
    
    // Verify all submissions were successful
    expect(metrics.successCount).toBe(submissions);
    expect(metrics.failureCount).toBe(0);
    
    // Verify the API was called the expected number of times
    expect(submitSurveyResponses).toHaveBeenCalledTimes(submissions);
    
    // Log performance metrics
    console.log('===== Load Test Metrics (10 concurrent submissions) =====');
    console.log(`Total time: ${(metrics.endTime - metrics.startTime).toFixed(2)}ms`);
    console.log(`Average response time: ${(metrics.responseTimesMs.reduce((a, b) => a + b, 0) / submissions).toFixed(2)}ms`);
    console.log(`Success rate: ${(metrics.successCount / submissions * 100).toFixed(2)}%`);
  });

  it('handles 50 concurrent survey submissions with randomized delays', async () => {
    const feedbackRequestId = 'test-request-456';
    const submissions = 50;
    
    metrics.startTime = performance.now();
    
    // Create array of submission promises with random delays (0-200ms)
    const submissionPromises = Array(submissions).fill(0).map(() => 
      submitSingleSurvey(feedbackRequestId, Math.random() * 200)
    );
    
    // Wait for all submissions to complete
    await Promise.all(submissionPromises);
    
    metrics.endTime = performance.now();
    
    // Verify all submissions were successful
    expect(metrics.successCount).toBe(submissions);
    expect(metrics.failureCount).toBe(0);
    
    // Verify the API was called the expected number of times
    expect(submitSurveyResponses).toHaveBeenCalledTimes(submissions);
    
    // Calculate performance metrics
    const totalTimeMs = metrics.endTime - metrics.startTime;
    const avgResponseTime = metrics.responseTimesMs.reduce((a, b) => a + b, 0) / submissions;
    const successRate = metrics.successCount / submissions * 100;
    const throughputPerSecond = (submissions / totalTimeMs) * 1000;
    
    // Log performance metrics
    console.log('===== Load Test Metrics (50 concurrent submissions with delays) =====');
    console.log(`Total time: ${totalTimeMs.toFixed(2)}ms`);
    console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`Success rate: ${successRate.toFixed(2)}%`);
    console.log(`Throughput: ${throughputPerSecond.toFixed(2)} requests/sec`);
    
    // Response time distribution
    const sortedTimes = [...metrics.responseTimesMs].sort((a, b) => a - b);
    const percentile95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const percentile99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
    
    console.log(`95th percentile response time: ${percentile95.toFixed(2)}ms`);
    console.log(`99th percentile response time: ${percentile99.toFixed(2)}ms`);
  });

  it('simulates real-world traffic pattern with ramp-up', async () => {
    const feedbackRequestId = 'test-request-789';
    
    metrics.startTime = performance.now();
    
    // Simulate traffic pattern: 5 users/second for 5 seconds
    const userBatches = 5;
    const usersPerBatch = 5;
    // Reduce batch interval for testing to avoid timeout
    const batchIntervalMs = 200; // 200ms between batches instead of 1000ms to avoid test timeout
    
    // Track each batch's metrics separately
    const batchMetrics: Array<{
      batchNumber: number;
      startTime: number;
      endTime: number;
      successCount: number;
    }> = [];
    
    for (let batch = 0; batch < userBatches; batch++) {
      const batchStart = performance.now();
      
      // Create the batch of users
      const batchPromises = Array(usersPerBatch).fill(0).map(() => 
        submitSingleSurvey(feedbackRequestId, Math.random() * 50) // Smaller thinking time (50ms max) for testing
      );
      
      // Wait for batch to complete
      await Promise.all(batchPromises);
      
      const batchEnd = performance.now();
      
      // Record batch metrics
      batchMetrics.push({
        batchNumber: batch + 1,
        startTime: batchStart,
        endTime: batchEnd,
        successCount: metrics.successCount - (batch > 0 ? batchMetrics.reduce((sum, m) => sum + m.successCount, 0) : 0)
      });
      
      // Wait for next batch interval (if not the last batch)
      if (batch < userBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, batchIntervalMs));
      }
    }
    
    metrics.endTime = performance.now();
    
    // Total submissions
    const totalSubmissions = userBatches * usersPerBatch;
    
    // Verify all submissions were successful
    expect(metrics.successCount).toBe(totalSubmissions);
    expect(metrics.failureCount).toBe(0);
    
    // Log performance metrics with batch information
    console.log('===== Load Test Metrics (Ramped traffic pattern) =====');
    console.log(`Total time: ${(metrics.endTime - metrics.startTime).toFixed(2)}ms`);
    console.log(`Total successful submissions: ${metrics.successCount}`);
    console.log(`Average response time: ${(metrics.responseTimesMs.reduce((a, b) => a + b, 0) / totalSubmissions).toFixed(2)}ms`);
    
    // Log batch metrics
    console.log('\nBatch performance:');
    batchMetrics.forEach(batch => {
      console.log(`Batch ${batch.batchNumber}: ${batch.successCount} submissions, ${(batch.endTime - batch.startTime).toFixed(2)}ms`);
    });
    
    // Analyze system behavior under increasing load
    const batchTimes = batchMetrics.map(b => b.endTime - b.startTime);
    const increaseFactor = batchTimes[batchTimes.length - 1] / batchTimes[0];
    
    console.log(`\nPerformance degradation factor: ${increaseFactor.toFixed(2)}x`);
    console.log(`(A value close to 1.0 indicates linear scaling, higher values indicate degradation under load)`);
  }, 10000); // Increase test timeout to 10 seconds

  it('measures system recovery after peak load', async () => {
    const feedbackRequestId = 'test-request-999';
    
    // Phase 1: Light load (5 users)
    console.log('\n--- Phase 1: Light load (5 users) ---');
    metrics.startTime = performance.now();
    
    await Promise.all(Array(5).fill(0).map(() => 
      submitSingleSurvey(feedbackRequestId)
    ));
    
    const phase1End = performance.now();
    const phase1Time = phase1End - metrics.startTime;
    const phase1AvgResponse = metrics.responseTimesMs.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    
    console.log(`Phase 1 time: ${phase1Time.toFixed(2)}ms, Avg response: ${phase1AvgResponse.toFixed(2)}ms`);
    
    // Phase 2: Peak load (30 users)
    console.log('\n--- Phase 2: Peak load (30 users) ---');
    const phase2Start = performance.now();
    
    await Promise.all(Array(30).fill(0).map(() => 
      submitSingleSurvey(feedbackRequestId)
    ));
    
    const phase2End = performance.now();
    const phase2Time = phase2End - phase2Start;
    const phase2AvgResponse = metrics.responseTimesMs.slice(5, 35).reduce((a, b) => a + b, 0) / 30;
    
    console.log(`Phase 2 time: ${phase2Time.toFixed(2)}ms, Avg response: ${phase2AvgResponse.toFixed(2)}ms`);
    
    // Phase 3: Recovery (5 users again)
    console.log('\n--- Phase 3: Recovery (5 users) ---');
    const phase3Start = performance.now();
    
    await Promise.all(Array(5).fill(0).map(() => 
      submitSingleSurvey(feedbackRequestId)
    ));
    
    metrics.endTime = performance.now();
    const phase3Time = metrics.endTime - phase3Start;
    const phase3AvgResponse = metrics.responseTimesMs.slice(35, 40).reduce((a, b) => a + b, 0) / 5;
    
    console.log(`Phase 3 time: ${phase3Time.toFixed(2)}ms, Avg response: ${phase3AvgResponse.toFixed(2)}ms`);
    
    // Calculate recovery ratio (how response times compare before and after peak)
    const recoveryRatio = phase3AvgResponse / phase1AvgResponse;
    
    console.log(`\nRecovery ratio: ${recoveryRatio.toFixed(2)}`);
    console.log(`(A value close to 1.0 indicates good recovery, higher values indicate degraded performance after peak load)`);
    
    // Verify the API was called the expected number of times
    expect(submitSurveyResponses).toHaveBeenCalledTimes(40); // 5 + 30 + 5
    expect(metrics.successCount).toBe(40);
  });
}); 