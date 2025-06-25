import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardPage } from '../DashboardPage';
import { useDashboardData } from '@/hooks/useDashboardData';
import { MemoryRouter } from 'react-router-dom';

// Mock the useDashboardData hook
vi.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: vi.fn()
}));

// Mock all dashboard components
vi.mock('@/components/dashboard/OnboardingSection', () => ({
  OnboardingSection: () => <div data-testid="onboarding-section">Onboarding</div>
}));

vi.mock('@/components/dashboard/ReviewCycleSelector', () => ({
  ReviewCycleSelector: ({ selectedCycleId, onCycleChange }: any) => (
    <div data-testid="review-cycle-selector">
      <span>Selected: {selectedCycleId}</span>
      <button onClick={() => onCycleChange('new-cycle')}>Change Cycle</button>
    </div>
  )
}));

vi.mock('@/components/dashboard/ActiveReviewCycleCard', () => ({
  ActiveReviewCycleCard: ({ activeReviewCycle }: any) => (
    <div data-testid="active-review-cycle-card">
      Active Cycle: {activeReviewCycle?.title}
    </div>
  )
}));

vi.mock('@/components/dashboard/CurrentCycleEmployees', () => ({
  CurrentCycleEmployees: ({ employees }: any) => (
    <div data-testid="current-cycle-employees">
      Employees: {employees?.length || 0}
    </div>
  )
}));

vi.mock('@/components/dashboard/OtherEmployees', () => ({
  OtherEmployees: ({ employeesData, onAddEmployeeToCycle }: any) => (
    <div data-testid="other-employees">
      <span>Other Employees: {employeesData?.length || 0}</span>
      <button onClick={() => onAddEmployeeToCycle('emp-1')}>Add Employee</button>
    </div>
  )
}));

vi.mock('@/components/dashboard/AnalyticsSection', () => ({
  AnalyticsSection: ({ activeReviewCycle }: any) => (
    <div data-testid="analytics-section">
      Analytics for: {activeReviewCycle?.title}
    </div>
  )
}));

const mockUseDashboardData = useDashboardData as any;

const defaultDashboardData = {
  isLoading: false,
  activeReviewCycle: null,
  employees: [],
  employeesData: [],
  allReviewCycles: [],
  selectedCycleId: null,
  surveyQuestions: {},
  user: { id: 'user-1', email: 'test@example.com' },
  isMasterAccount: false,
  viewingAllAccounts: false,
  currentCycleUserEmail: null,
  currentCycleUserId: null,
  handleCycleChange: vi.fn(),
  handleAddEmployeeToCycle: vi.fn()
};

const renderDashboard = (overrides = {}) => {
  mockUseDashboardData.mockReturnValue({
    ...defaultDashboardData,
    ...overrides
  });

  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading indicator when data is loading', () => {
      renderDashboard({ isLoading: true });
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Onboarding Flow', () => {
    it('should show onboarding for new users with no employees', () => {
      renderDashboard({ 
        isLoading: false,
        employeesData: [] 
      });
      
      expect(screen.getByTestId('onboarding-section')).toBeInTheDocument();
      expect(screen.queryByTestId('review-cycle-selector')).not.toBeInTheDocument();
    });

    it('should not show onboarding when user has employees', () => {
      renderDashboard({ 
        isLoading: false,
        employeesData: [
          { id: '1', name: 'John Doe', role: 'Developer' }
        ]
      });
      
      expect(screen.queryByTestId('onboarding-section')).not.toBeInTheDocument();
      expect(screen.getByTestId('review-cycle-selector')).toBeInTheDocument();
    });
  });

  describe('Review Cycle Management', () => {
    it('should render review cycle selector with proper props', () => {
      const mockHandleCycleChange = vi.fn();
      const mockReviewCycles = [
        { id: 'cycle-1', title: 'Q1 Review', review_by_date: '2024-03-31' }
      ];

      renderDashboard({
        employeesData: [{ id: '1', name: 'John' }],
        selectedCycleId: 'cycle-1',
        allReviewCycles: mockReviewCycles,
        activeReviewCycle: mockReviewCycles[0],
        handleCycleChange: mockHandleCycleChange,
        isMasterAccount: true,
        viewingAllAccounts: true,
        user: { id: 'user-1' }
      });

      expect(screen.getByTestId('review-cycle-selector')).toBeInTheDocument();
      expect(screen.getByText('Selected: cycle-1')).toBeInTheDocument();
    });

    it('should display active review cycle card when cycle exists', () => {
      const activeReviewCycle = {
        id: 'cycle-1',
        title: 'Q1 Performance Review',
        review_by_date: '2024-03-31'
      };

      renderDashboard({
        employeesData: [{ id: '1', name: 'John' }],
        activeReviewCycle
      });

      expect(screen.getByTestId('active-review-cycle-card')).toBeInTheDocument();
      expect(screen.getByText('Active Cycle: Q1 Performance Review')).toBeInTheDocument();
    });

    it('should not display active review cycle card when no active cycle', () => {
      renderDashboard({
        employeesData: [{ id: '1', name: 'John' }],
        activeReviewCycle: null
      });

      expect(screen.queryByTestId('active-review-cycle-card')).not.toBeInTheDocument();
    });
  });

  describe('Master Account Features', () => {
    it('should display master account badge when viewing other user cycle', () => {
      renderDashboard({
        employeesData: [{ id: '1', name: 'John' }],
        currentCycleUserEmail: 'other@example.com',
        activeReviewCycle: { id: 'cycle-1', title: 'Q1 Review' }
      });

      expect(screen.getByText('Master View')).toBeInTheDocument();
      expect(screen.getByText(/Review cycle created by:/)).toBeInTheDocument();
      expect(screen.getByText('other@example.com')).toBeInTheDocument();
    });

    it('should not display master account badge when no current cycle user email', () => {
      renderDashboard({
        employeesData: [{ id: '1', name: 'John' }],
        currentCycleUserEmail: null,
        activeReviewCycle: { id: 'cycle-1', title: 'Q1 Review' }
      });

      expect(screen.queryByText('Master View')).not.toBeInTheDocument();
    });

    it('should not display master account badge when no active review cycle', () => {
      renderDashboard({
        employeesData: [{ id: '1', name: 'John' }],
        currentCycleUserEmail: 'other@example.com',
        activeReviewCycle: null
      });

      expect(screen.queryByText('Master View')).not.toBeInTheDocument();
    });
  });

  describe('Analytics Section', () => {
    it('should display analytics section when active review cycle exists', () => {
      const activeReviewCycle = {
        id: 'cycle-1',
        title: 'Q1 Review',
        review_by_date: '2024-03-31'
      };

      renderDashboard({
        employeesData: [{ id: '1', name: 'John' }],
        activeReviewCycle,
        allReviewCycles: [activeReviewCycle],
        employees: [{ id: '1', name: 'John', total_reviews: 5 }],
        surveyQuestions: { Q1: 'Question 1' }
      });

      expect(screen.getByTestId('analytics-section')).toBeInTheDocument();
      expect(screen.getByText('Analytics for: Q1 Review')).toBeInTheDocument();
    });

    it('should not display analytics section when no active review cycle', () => {
      renderDashboard({
        employeesData: [{ id: '1', name: 'John' }],
        activeReviewCycle: null
      });

      expect(screen.queryByTestId('analytics-section')).not.toBeInTheDocument();
    });
  });

  describe('Employee Management', () => {
    it('should display current cycle employees when they have reviews', () => {
      const employees = [
        { id: '1', name: 'John', total_reviews: 5 },
        { id: '2', name: 'Jane', total_reviews: 3 }
      ];

      const activeReviewCycle = {
        id: 'cycle-1',
        title: 'Q1 Review',
        review_by_date: '2024-03-31'
      };

      renderDashboard({
        employeesData: [{ id: '1', name: 'John' }],
        employees,
        activeReviewCycle
      });

      expect(screen.getByTestId('current-cycle-employees')).toBeInTheDocument();
      expect(screen.getByText('Employees: 2')).toBeInTheDocument();
    });

    it('should not display current cycle employees when none have reviews', () => {
      const employees = [
        { id: '1', name: 'John', total_reviews: 0 }
      ];

      const activeReviewCycle = {
        id: 'cycle-1',
        title: 'Q1 Review',
        review_by_date: '2024-03-31'
      };

      renderDashboard({
        employeesData: [{ id: '1', name: 'John' }],
        employees,
        activeReviewCycle
      });

      expect(screen.queryByTestId('current-cycle-employees')).not.toBeInTheDocument();
    });

    it('should display other employees section with proper props', () => {
      const mockHandleAddEmployee = vi.fn();
      const employeesData = [
        { id: '1', name: 'John', role: 'Developer' },
        { id: '2', name: 'Jane', role: 'Designer' }
      ];

      renderDashboard({
        employeesData,
        activeReviewCycle: { id: 'cycle-1', title: 'Q1 Review' },
        handleAddEmployeeToCycle: mockHandleAddEmployee,
        isMasterAccount: true,
        viewingAllAccounts: false,
        user: { id: 'user-1' },
        currentCycleUserId: 'user-2'
      });

      expect(screen.getByTestId('other-employees')).toBeInTheDocument();
      expect(screen.getByText('Other Employees: 2')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should pass all required props to child components', () => {
      const mockData = {
        employeesData: [{ id: '1', name: 'John' }],
        selectedCycleId: 'cycle-1',
        allReviewCycles: [{ id: 'cycle-1', title: 'Q1 Review' }],
        activeReviewCycle: { id: 'cycle-1', title: 'Q1 Review' },
        employees: [{ id: '1', name: 'John', total_reviews: 5 }],
        surveyQuestions: { Q1: 'Question 1' },
        handleCycleChange: vi.fn(),
        handleAddEmployeeToCycle: vi.fn(),
        isMasterAccount: true,
        viewingAllAccounts: false,
        user: { id: 'user-1' },
        currentCycleUserId: 'user-2'
      };

      renderDashboard(mockData);

      // Verify all major components are rendered
      expect(screen.getByTestId('review-cycle-selector')).toBeInTheDocument();
      expect(screen.getByTestId('active-review-cycle-card')).toBeInTheDocument();
      expect(screen.getByTestId('analytics-section')).toBeInTheDocument();
      expect(screen.getByTestId('current-cycle-employees')).toBeInTheDocument();
      expect(screen.getByTestId('other-employees')).toBeInTheDocument();
    });

    it('should handle empty state gracefully', () => {
      renderDashboard({
        employeesData: [{ id: '1', name: 'John' }],
        activeReviewCycle: null,
        employees: [],
        allReviewCycles: [],
        surveyQuestions: {}
      });

      // Should still render basic structure
      expect(screen.getByTestId('review-cycle-selector')).toBeInTheDocument();
      expect(screen.getByTestId('other-employees')).toBeInTheDocument();
      
      // Should not render cycle-dependent components
      expect(screen.queryByTestId('active-review-cycle-card')).not.toBeInTheDocument();
      expect(screen.queryByTestId('analytics-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('current-cycle-employees')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('should render with proper container structure', () => {
      renderDashboard({
        employeesData: [{ id: '1', name: 'John' }]
      });

      const container = screen.getByTestId('review-cycle-selector').closest('.container');
      expect(container).toHaveClass('container', 'mx-auto');
    });
  });
}); 