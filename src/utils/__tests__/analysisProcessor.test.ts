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

vi.mock('openai', () => ({
  OpenAI: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn()
      }
    }
  }))
}));

vi.mock('./feedback', () => ({
  analyzeRelationshipFeedback: vi.fn()
}));

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

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock environment variable
    import.meta.env = { VITE_OPENAI_API_KEY: 'test-api-key' };
  });

  describe('processAnalysis', () => {
    describe('Successful Analysis Flow', () => {
      beforeEach(async () => {
        const { analyzeRelationshipFeedback } = await import('../feedback');
        (analyzeRelationshipFeedback as any).mockResolvedValue({
          key_insights: ['Insight 1'],
          competency_scores: [
            {
              name: 'Leadership & Influence',
              score: 4,
              confidence: 'high',
              description: 'Strong leadership',
              evidenceCount: 2,
              evidenceQuotes: ['Quote 1', 'Quote 2']
            }
          ]
        });
      });

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
        const { analyzeRelationshipFeedback } = await import('../feedback');

        await processAnalysis(
          'test-request-id',
          mockGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        expect(analyzeRelationshipFeedback).toHaveBeenCalledWith(
          'senior',
          mockGroupedFeedback.senior,
          expect.any(Object)
        );
        expect(analyzeRelationshipFeedback).toHaveBeenCalledWith(
          'peer',
          mockGroupedFeedback.peer,
          expect.any(Object)
        );
        expect(analyzeRelationshipFeedback).toHaveBeenCalledWith(
          'junior',
          mockGroupedFeedback.junior,
          expect.any(Object)
        );
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
        const upsertCall = supabase.from().upsert;
        expect(upsertCall).toHaveBeenCalledWith(
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
        (analyzeRelationshipFeedback as any).mockRejectedValue(new Error('OpenAI API error'));

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
        const { analyzeRelationshipFeedback } = await import('../feedback');
        const { supabase } = await import('@/lib/supabase');
        
        (analyzeRelationshipFeedback as any).mockResolvedValue({
          key_insights: [],
          competency_scores: []
        });

        supabase.from().upsert.mockResolvedValue({ 
          error: { message: 'Database connection failed' } 
        });

        await processAnalysis(
          'test-request-id',
          mockGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        expect(mockError).toHaveBeenCalledWith('Database connection failed');
        expect(mockSuccess).not.toHaveBeenCalled();
      });

      it('should handle unknown errors gracefully', async () => {
        const { analyzeRelationshipFeedback } = await import('../feedback');
        (analyzeRelationshipFeedback as any).mockRejectedValue('Unknown error type');

        await processAnalysis(
          'test-request-id',
          mockGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        expect(mockError).toHaveBeenCalledWith(
          'Failed to analyze feedback. Please try again later.'
        );
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty feedback groups', async () => {
        const emptyGroupedFeedback = {
          senior: [],
          peer: [],
          junior: []
        };

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
          junior: []
        };

        await processAnalysis(
          'test-request-id',
          partialGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        const { analyzeRelationshipFeedback } = await import('../feedback');
        expect(analyzeRelationshipFeedback).toHaveBeenCalledWith(
          'senior',
          partialGroupedFeedback.senior,
          expect.any(Object)
        );
        expect(analyzeRelationshipFeedback).toHaveBeenCalledWith(
          'peer',
          [],
          expect.any(Object)
        );
        expect(analyzeRelationshipFeedback).toHaveBeenCalledWith(
          'junior',
          [],
          expect.any(Object)
        );
      });

      it('should handle invalid feedback request ID', async () => {
        await processAnalysis(
          '',
          mockGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        // Should still attempt to process but with empty ID
        expect(mockStageChange).toHaveBeenCalledWith(0);
      });

      it('should handle invalid feedback hash', async () => {
        await processAnalysis(
          'test-request-id',
          mockGroupedFeedback,
          '',
          mockCallbacks
        );

        // Should still attempt to process but with empty hash
        expect(mockStageChange).toHaveBeenCalledWith(0);
      });
    });

    describe('Analysis Timing', () => {
      it('should include timestamp in saved results', async () => {
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

        const successCall = mockSuccess.mock.calls[0];
        const timestamp = successCall[1];
        expect(timestamp >= beforeTime).toBe(true);
        expect(timestamp <= afterTime).toBe(true);
      });
    });

    describe('OpenAI Configuration', () => {
      it('should initialize OpenAI with correct configuration', async () => {
        const { default: OpenAI } = await import('openai');

        await processAnalysis(
          'test-request-id',
          mockGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        expect(OpenAI).toHaveBeenCalledWith({
          apiKey: 'test-api-key',
          dangerouslyAllowBrowser: true
        });
      });

      it('should handle missing OpenAI API key', async () => {
        import.meta.env.VITE_OPENAI_API_KEY = undefined;

        await processAnalysis(
          'test-request-id',
          mockGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        // Should still create OpenAI instance but may fail during API calls
        expect(mockStageChange).toHaveBeenCalledWith(0);
      });
    });

    describe('Aggregate Insights Calculation', () => {
      beforeEach(async () => {
        const { analyzeRelationshipFeedback } = await import('../feedback');
        (analyzeRelationshipFeedback as any).mockImplementation((relationship) => {
          return Promise.resolve({
            key_insights: [`${relationship} insight`],
            competency_scores: [
              {
                name: 'Leadership & Influence',
                score: relationship === 'senior' ? 5 : relationship === 'peer' ? 4 : 3,
                confidence: 'high',
                description: `${relationship} leadership`,
                evidenceCount: 2,
                evidenceQuotes: [`${relationship} quote 1`, `${relationship} quote 2`]
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

        const successCall = mockSuccess.mock.calls[0];
        const insights = successCall[0];
        
        // Should have 4 insights: aggregate + senior + peer + junior
        expect(insights).toHaveLength(4);
        
        const aggregateInsight = insights.find((i: any) => i.relationship === 'aggregate');
        expect(aggregateInsight).toBeDefined();
        expect(aggregateInsight.responseCount).toBe(3); // Total responses
        expect(aggregateInsight.themes).toEqual(['senior insight', 'peer insight', 'junior insight']);
      });

      it('should handle competency score aggregation', async () => {
        await processAnalysis(
          'test-request-id',
          mockGroupedFeedback,
          'test-hash',
          mockCallbacks
        );

        const successCall = mockSuccess.mock.calls[0];
        const insights = successCall[0];
        const aggregateInsight = insights.find((i: any) => i.relationship === 'aggregate');
        
        expect(aggregateInsight.competencies).toBeDefined();
        expect(aggregateInsight.competencies.length).toBeGreaterThan(0);
        
        const leadershipCompetency = aggregateInsight.competencies.find(
          (c: any) => c.name === 'Leadership & Influence'
        );
        expect(leadershipCompetency).toBeDefined();
        expect(leadershipCompetency.score).toBeGreaterThan(0);
      });
    });
  });
});