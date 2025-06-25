import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDashboardData } from '../useDashboardData';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({ data: [], error: null }))
        })),
        order: vi.fn(() => ({ data: [], error: null })),
        in: vi.fn(() => ({
          order: vi.fn(() => ({ data: [], error: null }))
        }))
      }))
    }))
  }
}));

vi.mock('../useAuth', () => ({
  useAuth: vi.fn()
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn()
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: vi.fn()
}));

vi.mock('@/api/surveyQuestions', () => ({
  getSurveyQuestions: vi.fn()
}));

describe('useDashboardData', () => {
  const mockNavigate = vi.fn();
  const mockToast = vi.fn();
  const mockUseAuth = useAuth as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as any).mockReturnValue(mockNavigate);
    (useToast as any).mockReturnValue({ toast: mockToast });
    
    // Default auth state
    mockUseAuth.mockReturnValue({
      user: { id: 'test-user-id', email: 'test@example.com' },
      isMasterAccount: false,
      viewingAllAccounts: false
    });

    // Mock successful user fetch
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } }
    });

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn()
      }
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Authentication and Initial Load', () => {
    it('should redirect to login when user is not authenticated', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null }
      });

      renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });

    it('should start with loading state', () => {
      const { result } = renderHook(() => useDashboardData());
      expect(result.current.isLoading).toBe(true);
    });

    it('should handle auth errors gracefully', async () => {
      (supabase.auth.getUser as any).mockRejectedValue(new Error('Auth error'));

      renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive",
        });
      });
    });
  });

  describe('Data Fetching', () => {
    beforeEach(() => {
      // Mock successful database queries
      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          in: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      });
    });

    it('should fetch employees for regular account', async () => {
      const mockEmployees = [
        { id: '1', name: 'John Doe', role: 'Developer', user_id: 'test-user-id' }
      ];

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: mockEmployees, error: null }))
        }))
      }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect
      });

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith('employees');
      expect(mockSelect).toHaveBeenCalledWith('*');
    });

    it('should fetch all employees for master account viewing all accounts', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'master-user-id', email: 'master@example.com' },
        isMasterAccount: true,
        viewingAllAccounts: true
      });

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not filter by user_id for master account viewing all
      const selectCall = (supabase.from as any).mock.results[0].value.select;
      expect(selectCall).toHaveBeenCalledWith('*');
    });

    it('should fetch review cycles with proper relationships', async () => {
      const mockReviewCycles = [
        { 
          id: '1', 
          title: 'Q1 Review', 
          review_by_date: '2024-03-31',
          user_id: 'test-user-id'
        }
      ];

      (supabase.from as any).mockImplementation((tableName: string) => {
        if (tableName === 'review_cycles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: mockReviewCycles, error: null }))
              }))
            }))
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            })),
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        };
      });

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.allReviewCycles).toHaveLength(1);
        expect(result.current.allReviewCycles[0].title).toBe('Q1 Review');
      });
    });
  });

  describe('Review Cycle Management', () => {
    it('should handle cycle change and persist selection', async () => {
      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handleCycleChange('new-cycle-id');
      });

      expect(result.current.selectedCycleId).toBe('new-cycle-id');
      expect(window.localStorage.setItem).toHaveBeenCalledWith('selectedCycleId', 'new-cycle-id');
    });

    it('should restore selected cycle from localStorage', () => {
      (window.localStorage.getItem as any).mockReturnValue('stored-cycle-id');

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.selectedCycleId).toBe('stored-cycle-id');
    });
  });

  describe('Employee Management', () => {
    it('should handle adding employee to cycle', async () => {
      const mockEmployees = [
        { id: 'emp-1', name: 'John Doe', role: 'Developer', user_id: 'test-user-id' }
      ];

      const mockReviewCycles = [
        { id: 'cycle-1', title: 'Q1 Review', user_id: 'test-user-id' }
      ];

      // Mock successful database operations
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: [{ id: 'new-request-id' }], error: null }))
      }));

      (supabase.from as any).mockImplementation((tableName: string) => {
        if (tableName === 'feedback_requests') {
          return { insert: mockInsert };
        }
        if (tableName === 'employees') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: mockEmployees, error: null }))
              }))
            }))
          };
        }
        if (tableName === 'review_cycles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: mockReviewCycles, error: null }))
              }))
            }))
          };
        }
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        };
      });

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Set active review cycle
      act(() => {
        result.current.handleCycleChange('cycle-1');
      });

      await act(async () => {
        await result.current.handleAddEmployeeToCycle('emp-1');
      });

      expect(mockInsert).toHaveBeenCalledWith({
        employee_id: 'emp-1',
        review_cycle_id: 'cycle-1',
        unique_link: expect.any(String),
        target_responses: 3
      });
    });

    it('should handle errors when adding employee to cycle', async () => {
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Database error' } }))
      }));

      (supabase.from as any).mockImplementation((tableName: string) => {
        if (tableName === 'feedback_requests') {
          return { insert: mockInsert };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            })),
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        };
      });

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.handleAddEmployeeToCycle('emp-1');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "Failed to add employee to review cycle",
        variant: "destructive",
      });
    });
  });

  describe('Master Account Features', () => {
    it('should handle master account mode correctly', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'master-user-id', email: 'master@example.com' },
        isMasterAccount: true,
        viewingAllAccounts: true
      });

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.isMasterAccount).toBe(true);
        expect(result.current.viewingAllAccounts).toBe(true);
      });
    });

    it('should display current cycle user email in master mode', async () => {
      const mockReviewCycles = [
        { 
          id: 'cycle-1', 
          title: 'Q1 Review', 
          user_id: 'other-user-id',
          users: { email: 'other@example.com' }
        }
      ];

      mockUseAuth.mockReturnValue({
        user: { id: 'master-user-id', email: 'master@example.com' },
        isMasterAccount: true,
        viewingAllAccounts: true
      });

      (supabase.from as any).mockImplementation((tableName: string) => {
        if (tableName === 'review_cycles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: mockReviewCycles, error: null }))
              }))
            }))
          };
        }
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        };
      });

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.allReviewCycles[0].users?.email).toBe('other@example.com');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Database error' } }))
          }))
        }))
      });

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        });
      });
    });

    it('should handle network failures', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.reject(new Error('Network error')))
          }))
        }))
      });

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        });
      });
    });
  });

  describe('Survey Questions Management', () => {
    it('should fetch survey questions when cycle type changes', async () => {
      const { getSurveyQuestions } = await import('@/api/surveyQuestions');
      (getSurveyQuestions as any).mockResolvedValue({
        'Q1': 'Question 1',
        'Q2': 'Question 2'
      });

      const mockReviewCycles = [
        { 
          id: 'cycle-1', 
          title: 'Manager Survey', 
          type: 'manager_effectiveness',
          user_id: 'test-user-id'
        }
      ];

      (supabase.from as any).mockImplementation((tableName: string) => {
        if (tableName === 'review_cycles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: mockReviewCycles, error: null }))
              }))
            }))
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            })),
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        };
      });

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.surveyQuestions).toEqual({
          'Q1': 'Question 1',
          'Q2': 'Question 2'
        });
      });
    });
  });
}); 