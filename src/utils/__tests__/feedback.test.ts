import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeRelationship,
  createFeedbackHash,
  validateConfidenceLevel,
  formatLastAnalyzed,
  groupFeedbackByRelationship,
  analyzeRelationshipFeedback,
  analyzeAggregatePatterns
} from '../feedback';
import { CoreFeedbackResponse } from '@/types/feedback/base';
import { RELATIONSHIP_TYPES } from '@/constants/feedback';

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn()
    }
  }
};

describe('Feedback Processing Utils', () => {
  describe('normalizeRelationship', () => {
    it('should normalize senior relationships correctly', () => {
      expect(normalizeRelationship('senior_colleague')).toBe(RELATIONSHIP_TYPES.SENIOR);
      expect(normalizeRelationship('SENIOR COLLEAGUE')).toBe(RELATIONSHIP_TYPES.SENIOR);
      expect(normalizeRelationship('senior manager')).toBe(RELATIONSHIP_TYPES.SENIOR);
      expect(normalizeRelationship('senior_manager')).toBe(RELATIONSHIP_TYPES.SENIOR);
    });

    it('should normalize peer relationships correctly', () => {
      expect(normalizeRelationship('equal_colleague')).toBe(RELATIONSHIP_TYPES.PEER);
      expect(normalizeRelationship('peer')).toBe(RELATIONSHIP_TYPES.PEER);
      expect(normalizeRelationship('EQUAL COLLEAGUE')).toBe(RELATIONSHIP_TYPES.PEER);
      expect(normalizeRelationship('peer_colleague')).toBe(RELATIONSHIP_TYPES.PEER);
    });

    it('should normalize junior relationships correctly', () => {
      expect(normalizeRelationship('junior_colleague')).toBe(RELATIONSHIP_TYPES.JUNIOR);
      expect(normalizeRelationship('JUNIOR COLLEAGUE')).toBe(RELATIONSHIP_TYPES.JUNIOR);
      expect(normalizeRelationship('junior manager')).toBe(RELATIONSHIP_TYPES.JUNIOR);
      expect(normalizeRelationship('junior_report')).toBe(RELATIONSHIP_TYPES.JUNIOR);
    });

    it('should default to peer for unknown relationships', () => {
      expect(normalizeRelationship('unknown')).toBe(RELATIONSHIP_TYPES.PEER);
      expect(normalizeRelationship('')).toBe(RELATIONSHIP_TYPES.PEER);
      expect(normalizeRelationship('random_string')).toBe(RELATIONSHIP_TYPES.PEER);
    });

    it('should handle special characters and spacing', () => {
      expect(normalizeRelationship('senior-colleague')).toBe(RELATIONSHIP_TYPES.SENIOR);
      expect(normalizeRelationship('  peer  colleague  ')).toBe(RELATIONSHIP_TYPES.PEER);
      expect(normalizeRelationship('junior___colleague')).toBe(RELATIONSHIP_TYPES.JUNIOR);
    });
  });

  describe('createFeedbackHash', () => {
    it('should create consistent hash for same responses', () => {
      const responses: CoreFeedbackResponse[] = [
        {
          id: 'resp1',
          feedback_request_id: 'req1',
          session_id: 'session1',
          submitted_at: '2023-01-01T00:00:00Z',
          status: 'submitted',
          relationship: 'senior_colleague',
          strengths: 'Great leader',
          areas_for_improvement: 'Communication',
          created_at: '2023-01-01T00:00:00Z'
        },
        {
          id: 'resp2',
          feedback_request_id: 'req1',
          session_id: 'session2',
          submitted_at: '2023-01-02T00:00:00Z',
          status: 'submitted',
          relationship: 'peer',
          strengths: 'Technical skills',
          areas_for_improvement: 'Time management',
          created_at: '2023-01-02T00:00:00Z'
        }
      ];

      const hash1 = createFeedbackHash(responses);
      const hash2 = createFeedbackHash(responses);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toContain('resp1-2023-01-01T00:00:00Z');
      expect(hash1).toContain('resp2-2023-01-02T00:00:00Z');
    });

    it('should create different hash for different responses', () => {
      const responses1: CoreFeedbackResponse[] = [
        {
          id: 'resp1',
          feedback_request_id: 'req1',
          session_id: 'session1',
          submitted_at: '2023-01-01T00:00:00Z',
          status: 'submitted',
          relationship: 'senior_colleague',
          strengths: 'Great leader',
          areas_for_improvement: 'Communication',
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      const responses2: CoreFeedbackResponse[] = [
        {
          id: 'resp2',
          feedback_request_id: 'req1',
          session_id: 'session2',
          submitted_at: '2023-01-02T00:00:00Z',
          status: 'submitted',
          relationship: 'peer',
          strengths: 'Technical skills',
          areas_for_improvement: 'Time management',
          created_at: '2023-01-02T00:00:00Z'
        }
      ];

      const hash1 = createFeedbackHash(responses1);
      const hash2 = createFeedbackHash(responses2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty responses array', () => {
      const hash = createFeedbackHash([]);
      expect(hash).toBe('');
    });

    it('should sort responses consistently regardless of input order', () => {
      const response1 = {
        id: 'resp1',
        feedback_request_id: 'req1',
        session_id: 'session1',
        submitted_at: '2023-01-01T00:00:00Z',
        status: 'submitted' as const,
        relationship: 'senior_colleague' as const,
        strengths: 'Great leader',
        areas_for_improvement: 'Communication',
        created_at: '2023-01-01T00:00:00Z'
      };

      const response2 = {
        id: 'resp2',
        feedback_request_id: 'req1',
        session_id: 'session2',
        submitted_at: '2023-01-02T00:00:00Z',
        status: 'submitted' as const,
        relationship: 'peer' as const,
        strengths: 'Technical skills',
        areas_for_improvement: 'Time management',
        created_at: '2023-01-02T00:00:00Z'
      };

      const hash1 = createFeedbackHash([response1, response2]);
      const hash2 = createFeedbackHash([response2, response1]);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('validateConfidenceLevel', () => {
    it('should return low confidence for 0-2 reviewers', () => {
      expect(validateConfidenceLevel(0)).toBe('low');
      expect(validateConfidenceLevel(1)).toBe('low');
      expect(validateConfidenceLevel(2)).toBe('low');
    });

    it('should return medium confidence for exactly 3 reviewers', () => {
      expect(validateConfidenceLevel(3)).toBe('medium');
    });

    it('should return high confidence for 4+ reviewers', () => {
      expect(validateConfidenceLevel(4)).toBe('high');
      expect(validateConfidenceLevel(5)).toBe('high');
      expect(validateConfidenceLevel(10)).toBe('high');
      expect(validateConfidenceLevel(100)).toBe('high');
    });

    it('should handle edge case of negative numbers', () => {
      expect(validateConfidenceLevel(-1)).toBe('low');
      expect(validateConfidenceLevel(-10)).toBe('low');
    });
  });

  describe('formatLastAnalyzed', () => {
    it('should return null for null timestamp', () => {
      expect(formatLastAnalyzed(null)).toBeNull();
    });

    it('should format valid timestamp correctly', () => {
      const timestamp = '2023-07-15T14:30:00Z';
      const formatted = formatLastAnalyzed(timestamp);
      
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
      // Should contain month, day, time elements
      expect(formatted).toMatch(/Jul|July/);
      expect(formatted).toMatch(/15/);
      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
      expect(formatted).toMatch(/AM|PM/);
    });

    it('should handle different date formats', () => {
      const timestamps = [
        '2023-01-01T00:00:00Z',
        '2023-12-31T23:59:59Z',
        '2023-06-15T12:00:00.000Z'
      ];

      timestamps.forEach(timestamp => {
        const formatted = formatLastAnalyzed(timestamp);
        expect(formatted).toBeTruthy();
        expect(typeof formatted).toBe('string');
      });
    });

    it('should handle invalid date strings gracefully', () => {
      // Invalid dates should still create a Date object, but might format strangely
      const formatted = formatLastAnalyzed('invalid-date');
      expect(typeof formatted).toBe('string');
    });
  });

  describe('groupFeedbackByRelationship', () => {
    const sampleResponses: CoreFeedbackResponse[] = [
      {
        id: 'resp1',
        feedback_request_id: 'req1',
        session_id: 'session1',
        submitted_at: '2023-01-01T00:00:00Z',
        status: 'submitted',
        relationship: 'senior_colleague',
        strengths: 'Leadership',
        areas_for_improvement: 'Delegation',
        created_at: '2023-01-01T00:00:00Z'
      },
      {
        id: 'resp2',
        feedback_request_id: 'req1',
        session_id: 'session2',
        submitted_at: '2023-01-02T00:00:00Z',
        status: 'submitted',
        relationship: 'equal_colleague',
        strengths: 'Technical expertise',
        areas_for_improvement: 'Communication',
        created_at: '2023-01-02T00:00:00Z'
      },
      {
        id: 'resp3',
        feedback_request_id: 'req1',
        session_id: 'session3',
        submitted_at: '2023-01-03T00:00:00Z',
        status: 'submitted',
        relationship: 'junior_colleague',
        strengths: 'Mentoring',
        areas_for_improvement: 'Strategic thinking',
        created_at: '2023-01-03T00:00:00Z'
      },
      {
        id: 'resp4',
        feedback_request_id: 'req1',
        session_id: 'session4',
        submitted_at: '2023-01-04T00:00:00Z',
        status: 'submitted',
        relationship: 'senior_colleague',
        strengths: 'Vision',
        areas_for_improvement: 'Execution',
        created_at: '2023-01-04T00:00:00Z'
      }
    ];

    it('should group feedback by normalized relationship types', () => {
      const grouped = groupFeedbackByRelationship(sampleResponses);

      expect(grouped.senior).toHaveLength(2);
      expect(grouped.peer).toHaveLength(1);
      expect(grouped.junior).toHaveLength(1);

      expect(grouped.senior[0].id).toBe('resp1');
      expect(grouped.senior[1].id).toBe('resp4');
      expect(grouped.peer[0].id).toBe('resp2');
      expect(grouped.junior[0].id).toBe('resp3');
    });

    it('should handle empty feedback array', () => {
      const grouped = groupFeedbackByRelationship([]);

      expect(grouped.senior).toHaveLength(0);
      expect(grouped.peer).toHaveLength(0);
      expect(grouped.junior).toHaveLength(0);
    });

    it('should handle mixed and unknown relationship types', () => {
      const mixedResponses: CoreFeedbackResponse[] = [
        {
          id: 'resp1',
          feedback_request_id: 'req1',
          session_id: 'session1',
          submitted_at: '2023-01-01T00:00:00Z',
          status: 'submitted',
          relationship: 'unknown_type' as any,
          strengths: 'Something',
          areas_for_improvement: 'Something else',
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      const grouped = groupFeedbackByRelationship(mixedResponses);

      // Unknown types should default to peer
      expect(grouped.peer).toHaveLength(1);
      expect(grouped.senior).toHaveLength(0);
      expect(grouped.junior).toHaveLength(0);
    });
  });

  describe('analyzeRelationshipFeedback', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should call OpenAI with correct parameters and return parsed response', async () => {
      const mockResponse = {
        key_insights: ['Insight 1', 'Insight 2'],
        competency_scores: [
          {
            name: 'Leadership & Influence',
            score: 4,
            confidence: 'high',
            description: 'Strong leadership skills',
            evidenceCount: 3,
            evidenceQuotes: ['Quote 1', 'Quote 2']
          }
        ]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockResponse)
            }
          }
        ]
      });

      const feedbackResponses: CoreFeedbackResponse[] = [
        {
          id: 'resp1',
          feedback_request_id: 'req1',
          session_id: 'session1',
          submitted_at: '2023-01-01T00:00:00Z',
          status: 'submitted',
          relationship: 'senior_colleague',
          strengths: 'Great leadership',
          areas_for_improvement: 'Better delegation',
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      const result = await analyzeRelationshipFeedback(
        'senior',
        feedbackResponses,
        mockOpenAI as any
      );

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: "gpt-4o",
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining("Analyze feedback for senior perspective")
          }),
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining("senior colleague")
          })
        ]),
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      expect(result).toEqual(mockResponse);
    });

    it('should format feedback responses correctly in the prompt', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: '{}' } }]
      });

      const feedbackResponses: CoreFeedbackResponse[] = [
        {
          id: 'resp1',
          feedback_request_id: 'req1',
          session_id: 'session1',
          submitted_at: '2023-01-01T00:00:00Z',
          status: 'submitted',
          relationship: 'senior_colleague',
          strengths: 'Strong technical skills',
          areas_for_improvement: 'Needs better communication',
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      await analyzeRelationshipFeedback('senior', feedbackResponses, mockOpenAI as any);

      const userMessage = mockOpenAI.chat.completions.create.mock.calls[0][0].messages[1];
      expect(userMessage.content).toContain('senior colleague');
      expect(userMessage.content).toContain('Strong technical skills');
      expect(userMessage.content).toContain('Needs better communication');
    });

    it('should handle OpenAI errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('OpenAI API error'));

      const feedbackResponses: CoreFeedbackResponse[] = [{
        id: 'resp1',
        feedback_request_id: 'req1',
        session_id: 'session1',
        submitted_at: '2023-01-01T00:00:00Z',
        status: 'submitted',
        relationship: 'senior_colleague',
        strengths: 'Great',
        areas_for_improvement: 'Good',
        created_at: '2023-01-01T00:00:00Z'
      }];

      await expect(
        analyzeRelationshipFeedback('senior', feedbackResponses, mockOpenAI as any)
      ).rejects.toThrow('OpenAI API error');
    });
  });

  describe('analyzeAggregatePatterns', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should call OpenAI with aggregate analysis parameters', async () => {
      const mockResponse = {
        themes: ['Theme 1', 'Theme 2'],
        competency_scores: [
          {
            name: 'Leadership & Influence',
            score: 4,
            confidence: 'medium',
            description: 'Overall strong leadership',
            evidenceCount: 5,
            evidenceQuotes: ['Evidence 1', 'Evidence 2']
          }
        ]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }]
      });

      const feedbackResponses: CoreFeedbackResponse[] = [
        {
          id: 'resp1',
          feedback_request_id: 'req1',
          session_id: 'session1',
          submitted_at: '2023-01-01T00:00:00Z',
          status: 'submitted',
          relationship: 'senior_colleague',
          strengths: 'Leadership',
          areas_for_improvement: 'Delegation',
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      const result = await analyzeAggregatePatterns(feedbackResponses, mockOpenAI as any);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: "gpt-4o",
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining("Analyze overall patterns across all feedback")
          })
        ]),
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle empty feedback array', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: '{"themes": [], "competency_scores": []}' } }]
      });

      const result = await analyzeAggregatePatterns([], mockOpenAI as any);
      
      expect(result.themes).toEqual([]);
      expect(result.competency_scores).toEqual([]);
    });
  });
});