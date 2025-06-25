import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  processAnalysis,
  type AnalysisSubstep
} from '../analysisProcessor';
import { CoreFeedbackResponse } from '@/types/feedback/base';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null })
    })
  }
}));

// Mock fetch for API calls
global.fetch = vi.fn();

vi.mock('@/constants/feedback', () => ({
  RELATIONSHIP_WEIGHTS: {
    senior: 0.4,
    peer: 0.4,
    junior: 0.2
  }
}));

describe('Analysis Processor Utils', () => {
  const mockStageChange = vi.fn();
  const mockError = vi.fn();
  const mockSuccess = vi.fn();

  const mockGroupedFeedback = {
    senior: [
      {
        id: 'resp1',
        feedback_request_id: 'req1',
        session_id: 'session1',
        submitted_at: '2023-01-01T00:00:00Z',
        status: 'submitted' as const,
        relationship: 'senior_colleague' as const,
        strengths: 'Strong leadership',
        areas_for_improvement: 'Better delegation',
        created_at: '2023-01-01T00:00:00Z'
      }
    ],
    peer: [
      {
        id: 'resp2',
        feedback_request_id: 'req1',
        session_id: 'session2',
        submitted_at: '2023-01-02T00:00:00Z',
        status: 'submitted' as const,
        relationship: 'equal_colleague' as const,
        strengths: 'Technical expertise',
        areas_for_improvement: 'Communication',
        created_at: '2023-01-02T00:00:00Z'
      }
    ],
    junior: [
      {
        id: 'resp3',
        feedback_request_id: 'req1',
        session_id: 'session3',
        submitted_at: '2023-01-03T00:00:00Z',
        status: 'submitted' as const,
        relationship: 'junior_colleague' as const,
        strengths: 'Mentoring',
        areas_for_improvement: 'Strategic thinking',
        created_at: '2023-01-03T00:00:00Z'
      }
    ]
  };

  const mockCallbacks = {
    onStageChange: mockStageChange,
    onError: mockError,
    onSuccess: mockSuccess
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset Supabase mocks to good state
    const { supabase } = await import('@/lib/supabase');
    supabase.from = vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null })
    });

    // Mock successful API responses
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        competency_scores: [
          {
            name: 'Leadership & Influence',
            score: 4,
            confidence: 'high',
            description: 'Strong leadership',
            evidenceCount: 2,
            effectiveEvidenceCount: 2,
            evidenceQuotes: ['Quote 1', 'Quote 2']
          }
        ],
        key_insights: ['Insight 1']
      })
    });
  });

  describe('processAnalysis', () => {
    describe('Successful Analysis Flow', () => {
      // No additional setup needed - using global fetch mock

      it('should call stage callbacks in correct order', async () => {
        await processAnalysis(
          'test-request-id',
          mockGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        expect(mockStageChange).toHaveBeenCalledWith(0); // Prepare
        expect(mockStageChange).toHaveBeenCalledWith(1, 'SENIOR'); // Senior analysis
        expect(mockStageChange).toHaveBeenCalledWith(1, 'PEER'); // Peer analysis
        expect(mockStageChange).toHaveBeenCalledWith(1, 'JUNIOR'); // Junior analysis
        expect(mockStageChange).toHaveBeenCalledWith(1, 'AGGREGATE'); // Aggregate
        expect(mockStageChange).toHaveBeenCalledWith(2); // Save to database
        expect(mockStageChange).toHaveBeenCalledWith(3); // Complete

        expect(mockStageChange).toHaveBeenCalledTimes(7);
      });

      it('should analyze all relationship types', async () => {
        await processAnalysis(
          'test-request-id',
          mockGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        // Should make API calls for each relationship type
        expect(global.fetch).toHaveBeenCalledWith('/api/analyze-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            relationship: 'senior',
            strengths: 'Strong leadership',
            areas_for_improvement: 'Better delegation'
          })
        });

        expect(global.fetch).toHaveBeenCalledWith('/api/analyze-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            relationship: 'peer',
            strengths: 'Technical expertise',
            areas_for_improvement: 'Communication'
          })
        });

        expect(global.fetch).toHaveBeenCalledWith('/api/analyze-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            relationship: 'junior',
            strengths: 'Mentoring',
            areas_for_improvement: 'Strategic thinking'
          })
        });
      });

      it('should save analysis results to database', async () => {
        const { supabase } = await import('@/lib/supabase');

        await processAnalysis(
          'test-request-id',
          mockGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        expect(supabase.from).toHaveBeenCalledWith('feedback_analytics');
        const fromResult = supabase.from('feedback_analytics');
        expect(fromResult.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            feedback_request_id: 'test-request-id',
            insights: expect.any(Array),
            feedback_hash: 'test-hash',
            last_analyzed_at: expect.any(String)
          }),
          {
            onConflict: 'feedback_request_id',
            ignoreDuplicates: false
          }
        );
      });

      it('should call success callback with results', async () => {
        await processAnalysis(
          'test-request-id',
          mockGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        expect(mockSuccess).toHaveBeenCalledWith(
          expect.any(Array), // insights
          expect.any(String)  // timestamp
        );
      });
    });

    describe('Error Handling', () => {
      it('should handle OpenAI API errors', async () => {
        const { analyzeRelationshipFeedback } = await import('../feedback');
        const mockFn = vi.mocked(analyzeRelationshipFeedback);
        mockFn.mockRejectedValue(new Error('OpenAI API error'));

        await processAnalysis(
          'test-request-id',
          mockGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        expect(mockError).toHaveBeenCalledWith('OpenAI API error');
        expect(mockSuccess).not.toHaveBeenCalled();
      });

      it('should handle database errors', async () => {
        const { supabase } = await import('@/lib/supabase');
        const { analyzeRelationshipFeedback } = await import('../feedback');
        const mockFn = vi.mocked(analyzeRelationshipFeedback);
        
        mockFn.mockResolvedValue({
          key_insights: [],
          competency_scores: []
        });

        // Mock database error
        const mockFrom = vi.fn().mockReturnValue({
          upsert: vi.fn().mockResolvedValue({ error: new Error('Database error') })
        });
        supabase.from = mockFrom;

        await processAnalysis(
          'test-request-id',
          mockGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        expect(mockError).toHaveBeenCalledWith('Database error');
      });

      it('should handle unknown errors gracefully', async () => {
        const { analyzeRelationshipFeedback } = await import('../feedback');
        const mockFn = vi.mocked(analyzeRelationshipFeedback);
        mockFn.mockRejectedValue('Unknown error type');

        await processAnalysis(
          'test-request-id',
          mockGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        expect(mockError).toHaveBeenCalledWith('Failed to analyze feedback. Please try again later.');
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty feedback groups', async () => {
        const emptyGroupedFeedback = {
          senior: [],
          peer: [],
          junior: []
        };

        const { analyzeRelationshipFeedback } = await import('../feedback');
        const mockFn = vi.mocked(analyzeRelationshipFeedback);
        mockFn.mockResolvedValue({
          key_insights: [],
          competency_scores: []
        });

        await processAnalysis(
          'test-request-id',
          emptyGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        expect(mockStageChange).toHaveBeenCalledWith(0);
        expect(mockStageChange).toHaveBeenCalledWith(1, 'SENIOR');
        expect(mockStageChange).toHaveBeenCalledWith(1, 'PEER');
        expect(mockStageChange).toHaveBeenCalledWith(1, 'JUNIOR');
      });

      it('should handle partial feedback groups', async () => {
        const partialGroupedFeedback = {
          senior: mockGroupedFeedback.senior,
          peer: [],
          junior: mockGroupedFeedback.junior
        };

        const { analyzeRelationshipFeedback } = await import('../feedback');
        const mockFn = vi.mocked(analyzeRelationshipFeedback);
        mockFn.mockResolvedValue({
          key_insights: ['Partial insight'],
          competency_scores: []
        });

        await processAnalysis(
          'test-request-id',
          partialGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        expect(mockFn).toHaveBeenCalledWith(
          'senior',
          partialGroupedFeedback.senior,
          expect.any(Object)
        );
        expect(mockFn).toHaveBeenCalledWith(
          'peer',
          partialGroupedFeedback.peer,
          expect.any(Object)
        );
        expect(mockFn).toHaveBeenCalledWith(
          'junior',
          partialGroupedFeedback.junior,
          expect.any(Object)
        );
      });

      it('should handle invalid feedback request ID', async () => {
        const { analyzeRelationshipFeedback } = await import('../feedback');
        const mockFn = vi.mocked(analyzeRelationshipFeedback);
        mockFn.mockResolvedValue({
          key_insights: [],
          competency_scores: []
        });

        await processAnalysis(
          '',
          mockGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        expect(mockSuccess).toHaveBeenCalled();
      });

      it('should handle invalid feedback hash', async () => {
        const { analyzeRelationshipFeedback } = await import('../feedback');
        const mockFn = vi.mocked(analyzeRelationshipFeedback);
        mockFn.mockResolvedValue({
          key_insights: [],
          competency_scores: []
        });

        await processAnalysis(
          'test-request-id',
          mockGroupedFeedback,
          '',
          mockCallbacks
        );

        expect(mockSuccess).toHaveBeenCalled();
      });
    });

    describe('Analysis Timing', () => {
      it('should include timestamp in saved results', async () => {
        const { analyzeRelationshipFeedback } = await import('../feedback');
        const mockFn = vi.mocked(analyzeRelationshipFeedback);
        mockFn.mockResolvedValue({
          key_insights: ['Timed insight'],
          competency_scores: []
        });

        const beforeTime = new Date().toISOString();

        await processAnalysis(
          'test-request-id',
          mockGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        const afterTime = new Date().toISOString();

        expect(mockSuccess).toHaveBeenCalledWith(
          expect.any(Array),
          expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
        );
      });
    });

    describe('OpenAI Configuration', () => {
      it('should initialize OpenAI with correct configuration', async () => {
        const { OpenAI } = await import('openai');

        await processAnalysis(
          'test-request-id',
          mockGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        expect(OpenAI).toHaveBeenCalledWith({
          apiKey: expect.any(String),
          dangerouslyAllowBrowser: true
        });
      });

      it('should handle missing OpenAI API key', async () => {
        // The API key validation happens at OpenAI instantiation, not our code
        // Since we're mocking OpenAI, this test verifies OpenAI would be called with undefined
        vi.stubGlobal('import.meta', {
          env: {}
        });

        const { analyzeRelationshipFeedback } = await import('../feedback');
        const mockFn = vi.mocked(analyzeRelationshipFeedback);
        mockFn.mockResolvedValue({
          key_insights: [],
          competency_scores: []
        });

        await processAnalysis(
          'test-request-id',
          mockGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        // Success should be called since we're mocking everything
        expect(mockSuccess).toHaveBeenCalled();

        // Restore API key
        vi.stubGlobal('import.meta', {
          env: { OPENAI_API_KEY: 'test-api-key' }
        });
      });
    });

    describe('Aggregate Insights Calculation', () => {
      beforeEach(async () => {
        const { analyzeRelationshipFeedback } = await import('../feedback');
        const mockFn = vi.mocked(analyzeRelationshipFeedback);
        mockFn.mockImplementation((relationship: string) => {
          return Promise.resolve({
            key_insights: [`${relationship} insight`],
            competency_scores: [
              {
                name: 'Leadership',
                score: relationship === 'senior' ? 4 : relationship === 'peer' ? 3 : 2,
                confidence: 'high',
                description: `${relationship} leadership`,
                evidenceCount: 1,
                effectiveEvidenceCount: 1,
                evidenceQuotes: [`${relationship} quote`]
              }
            ]
          });
        });
      });

      it('should calculate weighted aggregate scores', async () => {
        await processAnalysis(
          'test-request-id',
          mockGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        expect(mockSuccess).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              relationship: 'aggregate'
            })
          ]),
          expect.any(String)
        );
      });

      it('should handle competency score aggregation', async () => {
        await processAnalysis(
          'test-request-id',
          mockGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        const { analyzeRelationshipFeedback } = await import('../feedback');
        const mockFn = vi.mocked(analyzeRelationshipFeedback);
        // Verify that competency scores are aggregated
        expect(mockFn).toHaveBeenCalledTimes(3);
        expect(mockSuccess).toHaveBeenCalled();
      });
    });
  });
});