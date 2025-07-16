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
    from: vi.fn(),
    rpc: vi.fn()
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

// Mock the survey questions API at the top level
vi.mock('@/api/surveyQuestions', () => ({
  getSurveyQuestions: vi.fn()
}));

describe('useDashboardData', () => {
  const mockNavigate = vi.fn();
  const mockToast = vi.fn();
  const mockUseAuth = useAuth as any;
  const mockSupabase = supabase as any;

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

    // Setup default Supabase mock chain that properly supports .order().eq() chaining
    const createMockQuery = (data = [], error = null) => ({
      select: vi.fn(() => createMockQuery(data, error)),
      eq: vi.fn(() => createMockQuery(data, error)),
      order: vi.fn(() => ({
        ...createMockQuery(data, error),
        eq: vi.fn(() => Promise.resolve({ data, error })),
        then: vi.fn((callback) => callback({ data, error }))
      })),
      then: vi.fn((callback) => callback({ data, error })),
      catch: vi.fn()
    });

    mockSupabase.from.mockReturnValue(createMockQuery());
    mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

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
      // Reset mocks for each test in this section
      vi.clearAllMocks();
      
      // Setup specific mock data for successful queries with .order().eq() chaining
      const createMockQuery = (data = [], error = null) => ({
        select: vi.fn(() => createMockQuery(data, error)),
        eq: vi.fn(() => createMockQuery(data, error)),
        order: vi.fn(() => ({
          ...createMockQuery(data, error),
          eq: vi.fn(() => Promise.resolve({ data, error })),
          then: vi.fn((callback) => callback({ data, error }))
        })),
        then: vi.fn((callback) => callback({ data, error })),
        catch: vi.fn()
      });

      mockSupabase.from.mockReturnValue(createMockQuery());
    });

    it('should fetch employees for regular account', async () => {
      const mockEmployees = [
        { id: '1', name: 'John Doe', role: 'Developer', user_id: 'test-user-id' }
      ];

      const createEmployeesQuery = (data = mockEmployees, error = null) => ({
        select: vi.fn(() => createEmployeesQuery(data, error)),
        eq: vi.fn(() => createEmployeesQuery(data, error)),
        order: vi.fn(() => Promise.resolve({ data, error }))
      });

      const createCyclesQuery = (data = [], error = null) => ({
        select: vi.fn(() => createCyclesQuery(data, error)),
        eq: vi.fn(() => createCyclesQuery(data, error)),
        order: vi.fn(() => ({
          ...createCyclesQuery(data, error),
          eq: vi.fn(() => Promise.resolve({ data, error }))
        }))
      });

      mockSupabase.from.mockImplementation((tableName: string) => {
        if (tableName === 'employees') {
          return createEmployeesQuery();
        }
        return createCyclesQuery();
      });

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('employees');
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

      expect(mockSupabase.from).toHaveBeenCalledWith('employees');
    });

    it('should fetch review cycles with proper relationships', async () => {
      const mockReviewCycles = [
        { 
          id: '1', 
          title: 'Q1 Review', 
          review_by_date: '2024-03-31',
          user_id: 'test-user-id',
          feedback_requests: []
        }
      ];

      const createEmployeesQuery = (data = [], error = null) => ({
        select: vi.fn(() => createEmployeesQuery(data, error)),
        eq: vi.fn(() => createEmployeesQuery(data, error)),
        order: vi.fn(() => Promise.resolve({ data, error }))
      });

      const createCyclesQuery = (data = mockReviewCycles, error = null) => ({
        select: vi.fn(() => createCyclesQuery(data, error)),
        eq: vi.fn(() => createCyclesQuery(data, error)),
        order: vi.fn(() => ({
          ...createCyclesQuery(data, error),
          eq: vi.fn(() => Promise.resolve({ data, error }))
        }))
      });

      mockSupabase.from.mockImplementation((tableName: string) => {
        if (tableName === 'employees') {
          return createEmployeesQuery();
        }
        return createCyclesQuery();
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
      const mockInsert = vi.fn(() => Promise.resolve({ data: {}, error: null }));
      
      const createMockQuery = (data = [], error = null) => ({
        select: vi.fn(() => createMockQuery(data, error)),
        eq: vi.fn(() => createMockQuery(data, error)),
        order: vi.fn(() => ({
          ...createMockQuery(data, error),
          eq: vi.fn(() => Promise.resolve({ data, error }))
        })),
        insert: mockInsert
      });

      // Set up a cycle to add employee to
      const mockCycles = [{ 
        id: 'cycle-1', 
        title: 'Test Cycle', 
        review_by_date: '2024-03-31',
        user_id: 'test-user-id',
        feedback_requests: []
      }];

      const createCyclesQuery = (data = mockCycles, error = null) => ({
        select: vi.fn(() => createCyclesQuery(data, error)),
        eq: vi.fn(() => createCyclesQuery(data, error)),
        order: vi.fn(() => ({
          ...createCyclesQuery(data, error),
          eq: vi.fn(() => Promise.resolve({ data, error }))
        }))
      });

      mockSupabase.from.mockImplementation((tableName: string) => {
        if (tableName === 'feedback_requests') {
          return { insert: mockInsert };
        }
        if (tableName === 'review_cycles') {
          return createCyclesQuery();
        }
        return createMockQuery();
      });

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Change to the cycle first
      act(() => {
        result.current.handleCycleChange('cycle-1');
      });

      await waitFor(() => {
        expect(result.current.selectedCycleId).toBe('cycle-1');
      });

      // Now add employee
      await act(async () => {
        await result.current.handleAddEmployeeToCycle('emp-1');
      });

      expect(mockInsert).toHaveBeenCalledWith({
        employee_id: 'emp-1',
        review_cycle_id: 'cycle-1',
        status: 'pending',
        target_responses: 10,
        unique_link: expect.any(String)
      });
    });

    it('should handle errors when adding employee to cycle', async () => {
      const mockInsert = vi.fn(() => Promise.resolve({ 
        data: null, 
        error: { message: 'Database error' } 
      }));

      const createMockQuery = (data = [], error = null) => ({
        select: vi.fn(() => createMockQuery(data, error)),
        eq: vi.fn(() => createMockQuery(data, error)),
        order: vi.fn(() => ({
          ...createMockQuery(data, error),
          eq: vi.fn(() => Promise.resolve({ data, error }))
        }))
      });

      mockSupabase.from.mockImplementation((tableName: string) => {
        if (tableName === 'feedback_requests') {
          return { insert: mockInsert };
        }
        return createMockQuery();
      });

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.handleAddEmployeeToCycle('emp-1');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "No active cycle",
        description: "Please create a review cycle first",
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
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.allReviewCycles).toBeDefined();
    });

    it('should display current cycle user email in master mode', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'master-user-id', email: 'master@example.com' },
        isMasterAccount: true,
        viewingAllAccounts: true
      });

      const mockCycles = [{ 
        id: '1', 
        title: 'User Cycle', 
        review_by_date: '2024-03-31',
        user_id: 'other-user-id',
        feedback_requests: []
      }];

      const createEmployeesQuery = (data = [], error = null) => ({
        select: vi.fn(() => createEmployeesQuery(data, error)),
        eq: vi.fn(() => createEmployeesQuery(data, error)),
        order: vi.fn(() => Promise.resolve({ data, error }))
      });

      const createCyclesQuery = (data = mockCycles, error = null) => ({
        select: vi.fn(() => createCyclesQuery(data, error)),
        eq: vi.fn(() => createCyclesQuery(data, error)),
        order: vi.fn(() => Promise.resolve({ data, error }))
      });

      mockSupabase.from.mockImplementation((tableName: string) => {
        if (tableName === 'employees') {
          return createEmployeesQuery();
        }
        return createCyclesQuery();
      });

      // Mock the RPC call for user emails
      mockSupabase.rpc.mockResolvedValue({
        data: [{ id: 'other-user-id', email: 'other@example.com' }],
        error: null
      });

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.allReviewCycles).toHaveLength(1);
      });

      await waitFor(() => {
        expect(result.current.allReviewCycles[0].users?.email).toBe('other@example.com');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const createMockQuery = (data = [], error = { message: 'Database error' }) => ({
        select: vi.fn(() => createMockQuery(data, error)),
        eq: vi.fn(() => createMockQuery(data, error)),
        order: vi.fn(() => ({
          ...createMockQuery(data, error),
          eq: vi.fn(() => Promise.resolve({ data, error }))
        }))
      });

      mockSupabase.from.mockReturnValue(createMockQuery());

      renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error fetching review cycles",
          description: "Database error",
          variant: "destructive",
        });
      });
    });

    it('should handle network failures', async () => {
      const createMockQuery = () => ({
        select: vi.fn(() => createMockQuery()),
        eq: vi.fn(() => createMockQuery()),
        order: vi.fn(() => ({
          eq: vi.fn(() => Promise.reject(new Error('Network error')))
        }))
      });

      mockSupabase.from.mockReturnValue(createMockQuery());

      renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error loading dashboard data",
          description: "Please try refreshing the page",
          variant: "destructive",
        });
      });
    });
  });

  describe('Survey Questions Management', () => {
    it('should fetch survey questions when cycle type changes', async () => {
      const mockCycles = [{ 
        id: '1', 
        title: 'Q1 Review', 
        review_by_date: '2024-03-31',
        user_id: 'test-user-id',
        type: 'manager_effectiveness',
        feedback_requests: []
      }];

      const mockSurveyQuestionsData = [
        { id: 'Q1', question_text: 'Question 1' },
        { id: 'Q2', question_text: 'Question 2' }
      ];

      const createEmployeesQuery = (data = [], error = null) => ({
        select: vi.fn(() => createEmployeesQuery(data, error)),
        eq: vi.fn(() => createEmployeesQuery(data, error)),
        order: vi.fn(() => Promise.resolve({ data, error }))
      });

      const createCyclesQuery = (data = mockCycles, error = null) => ({
        select: vi.fn(() => createCyclesQuery(data, error)),
        eq: vi.fn(() => createCyclesQuery(data, error)),
        order: vi.fn(() => ({
          ...createCyclesQuery(data, error),
          eq: vi.fn(() => Promise.resolve({ data, error }))
        }))
      });

      const createSurveyQuestionsQuery = (data = mockSurveyQuestionsData, error = null) => ({
        select: vi.fn(() => createSurveyQuestionsQuery(data, error)),
        eq: vi.fn(() => Promise.resolve({ data, error }))
      });

      mockSupabase.from.mockImplementation((tableName: string) => {
        if (tableName === 'employees') {
          return createEmployeesQuery();
        }
        if (tableName === 'survey_questions') {
          return createSurveyQuestionsQuery();
        }
        return createCyclesQuery();
      });

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Wait for survey questions to be fetched
      await waitFor(() => {
        expect(result.current.surveyQuestions).toEqual({
          'Q1': 'Question 1',
          'Q2': 'Question 2'
        });
      });
    });
  });
}); 