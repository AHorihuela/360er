import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useReviewCycleForm } from '../useReviewCycleForm';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

// Mock auth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user-123' } })
}));

// Mock Supabase with proper method chaining
vi.mock('@/lib/supabase', () => {
  const mockSingle = vi.fn(() => Promise.resolve({ data: { id: 'cycle-123' }, error: null }));
  const mockSelect = vi.fn(() => ({ single: mockSingle }));
  const mockInsert = vi.fn(() => ({ select: mockSelect }));
  const mockFrom = vi.fn(() => ({ insert: mockInsert }));

  return {
    supabase: { from: mockFrom }
  };
});

describe('useReviewCycleForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form State Management', () => {
    it('should initialize with default 360_review state', () => {
      const { result } = renderHook(() => useReviewCycleForm());
      
      expect(result.current.formData.type).toBe('360_review');
      expect(result.current.formData.status).toBe('active');
      expect(result.current.isSubmitting).toBe(false);
    });

    it('should update form data correctly', () => {
      const { result } = renderHook(() => useReviewCycleForm());
      
      act(() => {
        result.current.updateFormData({ title: 'New Title' });
      });
      
      expect(result.current.formData.title).toBe('New Title');
    });

    it('should handle type changes with correct defaults', () => {
      const { result } = renderHook(() => useReviewCycleForm());
      
      act(() => {
        result.current.handleTypeChange('manager_to_employee');
      });
      
      expect(result.current.formData.type).toBe('manager_to_employee');
      expect(result.current.formData.title).toBe('Manager to Employee Feedback');
      // Should have far future date for continuous feedback
      expect(new Date(result.current.formData.review_by_date).getFullYear()).toBeGreaterThan(2030);
    });
  });

  describe('Form Submission', () => {
    it('should submit form with correct data', async () => {
      const { result } = renderHook(() => useReviewCycleForm());
      const { supabase } = await import('@/lib/supabase');
      
      // Update form data
      act(() => {
        result.current.updateFormData({ 
          title: 'Test Review Cycle',
          type: 'manager_to_employee'
        });
      });

      // Create mock form event
      const mockEvent = { preventDefault: vi.fn() } as any;

      // Submit form
      await act(async () => {
        await result.current.handleSubmit(mockEvent);
      });

      // Verify Supabase was called correctly
      expect(supabase.from).toHaveBeenCalledWith('review_cycles');
      expect(mockToast).toHaveBeenCalledWith({
        title: "Success",
        description: "Review cycle created successfully",
      });
      expect(mockNavigate).toHaveBeenCalledWith('/reviews');
      expect(result.current.isSubmitting).toBe(false);
    });

    it('should handle submission errors', async () => {
      const { result } = renderHook(() => useReviewCycleForm());
      const { supabase } = await import('@/lib/supabase');

      // Mock error response
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Database error' } }))
          }))
        }))
      } as any);

      const mockEvent = { preventDefault: vi.fn() } as any;

      await act(async () => {
        await result.current.handleSubmit(mockEvent);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Failed to create review cycle",
        variant: "destructive",
      });
      expect(result.current.isSubmitting).toBe(false);
    });

    it('should not submit without user', async () => {
      const { result } = renderHook(() => useReviewCycleForm());
      const { supabase } = await import('@/lib/supabase');
      
      // Mock the auth hook to return no user for this test
      const { useAuth } = await import('@/hooks/useAuth');
      vi.mocked(useAuth).mockReturnValue({ user: null } as any);

      const mockEvent = { preventDefault: vi.fn() } as any;

      await act(async () => {
        await result.current.handleSubmit(mockEvent);
      });

      expect(supabase.from).not.toHaveBeenCalled();
      
      // Restore the mock for other tests
      vi.mocked(useAuth).mockReturnValue({ user: { id: 'test-user-123' } } as any);
    });
  });

  describe('Navigation', () => {
    it('should handle cancel navigation', () => {
      const { result } = renderHook(() => useReviewCycleForm());
      
      act(() => {
        result.current.handleCancel();
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('/reviews');
    });
  });
}); 