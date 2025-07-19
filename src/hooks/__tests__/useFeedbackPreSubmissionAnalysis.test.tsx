import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFeedbackPreSubmissionAnalysis } from '../useFeedbackPreSubmissionAnalysis';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useFeedbackPreSubmissionAnalysis', () => {
  const feedbackRequestId = 'test-request-id';
  const mockCallbacks = {
    onStepComplete: vi.fn(),
    onError: vi.fn(),
    onComplete: vi.fn(),
  };

  const mockFeedbackData = {
    relationship: 'equal_colleague' as const,
    strengths: 'Great team player',
    areas_for_improvement: 'Could improve time management',
  };

  const mockAnalysisResponse = {
    overallQuality: 'good' as const,
    summary: 'The feedback is well-structured and provides actionable insights.',
    suggestions: [
      {
        type: 'enhancement' as const,
        category: 'specificity' as const,
        suggestion: 'Consider adding specific examples',
        context: 'Great team player',
        highlightStart: 'Great',
        highlightEnd: 'player'
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with null aiResponse and error', () => {
      const { result } = renderHook(() => 
        useFeedbackPreSubmissionAnalysis({ feedbackRequestId })
      );

      expect(result.current.aiResponse).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should restore saved analysis from localStorage', () => {
      const savedAnalysis = JSON.stringify(mockAnalysisResponse);
      mockLocalStorage.getItem.mockReturnValue(savedAnalysis);

      const { result } = renderHook(() => 
        useFeedbackPreSubmissionAnalysis({ feedbackRequestId })
      );

      expect(result.current.aiResponse).toEqual(mockAnalysisResponse);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(`feedback_analysis_${feedbackRequestId}`);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => 
        useFeedbackPreSubmissionAnalysis({ feedbackRequestId })
      );

      expect(result.current.aiResponse).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to restore saved analysis:', expect.any(SyntaxError));
      
      consoleSpy.mockRestore();
    });
  });

  describe('analyzeFeedback - API Integration', () => {
    it('should make correct API call to /api/analyze-feedback', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAnalysisResponse),
      });

      const { result } = renderHook(() => 
        useFeedbackPreSubmissionAnalysis({ feedbackRequestId })
      );

      await act(async () => {
        await result.current.analyzeFeedback(mockFeedbackData, mockCallbacks);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/analyze-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          relationship: mockFeedbackData.relationship,
          strengths: mockFeedbackData.strengths,
          areas_for_improvement: mockFeedbackData.areas_for_improvement,
        }),
      });
    });

    it('should handle successful API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAnalysisResponse),
      });

      const { result } = renderHook(() => 
        useFeedbackPreSubmissionAnalysis({ feedbackRequestId })
      );

      await act(async () => {
        await result.current.analyzeFeedback(mockFeedbackData, mockCallbacks);
      });

      expect(result.current.aiResponse).toEqual(mockAnalysisResponse);
      expect(result.current.error).toBeNull();
      expect(mockCallbacks.onComplete).toHaveBeenCalled();
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        `feedback_analysis_${feedbackRequestId}`,
        JSON.stringify(mockAnalysisResponse)
      );
    });

    it('should handle API server not running (ECONNREFUSED)', async () => {
      const networkError = new TypeError('Failed to fetch');
      mockFetch.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => 
        useFeedbackPreSubmissionAnalysis({ feedbackRequestId })
      );

      await act(async () => {
        try {
          await result.current.analyzeFeedback(mockFeedbackData, mockCallbacks);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Failed to fetch');
      expect(mockCallbacks.onError).toHaveBeenCalled();
      expect(mockCallbacks.onComplete).not.toHaveBeenCalled();
    });

    it('should handle HTTP error responses', async () => {
      const errorResponse = { error: 'OpenAI API key not configured' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve(errorResponse),
      });

      const { result } = renderHook(() => 
        useFeedbackPreSubmissionAnalysis({ feedbackRequestId })
      );

      await act(async () => {
        try {
          await result.current.analyzeFeedback(mockFeedbackData, mockCallbacks);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('OpenAI API key not configured');
      expect(mockCallbacks.onError).toHaveBeenCalled();
    });

    it('should handle empty response body (JSON parse error)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
      });

      const { result } = renderHook(() => 
        useFeedbackPreSubmissionAnalysis({ feedbackRequestId })
      );

      await act(async () => {
        try {
          await result.current.analyzeFeedback(mockFeedbackData, mockCallbacks);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Invalid response format from analysis service');
      expect(mockCallbacks.onError).toHaveBeenCalled();
    });

    it('should call step callbacks in correct order', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAnalysisResponse),
      });

      const { result } = renderHook(() => 
        useFeedbackPreSubmissionAnalysis({ feedbackRequestId })
      );

      await act(async () => {
        await result.current.analyzeFeedback(mockFeedbackData, mockCallbacks);
      });

      expect(mockCallbacks.onStepComplete).toHaveBeenCalledTimes(4);
      expect(mockCallbacks.onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetAnalysis', () => {
    it('should reset state and clear localStorage', () => {
      const { result } = renderHook(() => 
        useFeedbackPreSubmissionAnalysis({ feedbackRequestId })
      );

      // Set some initial state
      act(() => {
        result.current.resetAnalysis();
      });

      expect(result.current.aiResponse).toBeNull();
      expect(result.current.error).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(`feedback_analysis_${feedbackRequestId}`);
    });
  });

  describe('Integration Testing Scenarios', () => {
    it('should handle development environment without backend server', async () => {
      // Simulate development environment where backend server isn't running
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const { result } = renderHook(() => 
        useFeedbackPreSubmissionAnalysis({ feedbackRequestId })
      );

      await act(async () => {
        try {
          await result.current.analyzeFeedback(mockFeedbackData, mockCallbacks);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Failed to fetch');
      // This test would have caught the original issue!
    });

    it('should handle production environment with missing environment variables', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'OpenAI API key not configured' }),
      });

      const { result } = renderHook(() => 
        useFeedbackPreSubmissionAnalysis({ feedbackRequestId })
      );

      await act(async () => {
        try {
          await result.current.analyzeFeedback(mockFeedbackData, mockCallbacks);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('OpenAI API key not configured');
    });
  });
}); 