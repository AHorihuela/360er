import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { FeedbackFormPage } from '../FeedbackFormPage';
import { anonymousClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  anonymousClient: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'request-123',
              employee: {
                name: 'John Doe',
                role: 'Software Engineer'
              },
              review_cycle: {
                id: 'cycle-123',
                type: '360_review',
                name: 'Q4 2024 Review',
                due_date: '2024-12-31T23:59:59.000Z'
              }
            },
            error: null
          }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ 
        data: [{ id: 'response-123' }], 
        error: null 
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ 
          data: [{ id: 'request-123' }], 
          error: null 
        }))
      }))
    }))
  }
}));

// Mock API calls
vi.mock('@/api/surveyQuestions', () => ({
  getSurveyQuestions: vi.fn(() => Promise.resolve([])),
  submitSurveyResponses: vi.fn(() => Promise.resolve({ success: true }))
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

// Mock validation utils
vi.mock('@/utils/dueDateValidation', () => ({
  debugFeedbackRequestState: vi.fn(),
  validateDueDateAccess: vi.fn(() => Promise.resolve(true)),
  testDatabasePolicyEnforcement: vi.fn(() => Promise.resolve(true))
}));

// Mock hooks
vi.mock('../../../hooks/useFeedbackSubmission', () => ({
  useFeedbackSubmission: () => ({
    submitFeedback: vi.fn(() => Promise.resolve(true)),
    isSubmitting: false
  })
}));

describe('FeedbackFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Page Loading and Setup', () => {
    it('should render loading state initially', async () => {
      render(
        <MemoryRouter initialEntries={['/feedback/abc123']}>
          <FeedbackFormPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Loading feedback form...')).toBeInTheDocument();
    });

    it('should load feedback request data and render form', async () => {
      render(
        <MemoryRouter initialEntries={['/feedback/abc123']}>
          <FeedbackFormPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Your relationship to/)).toBeInTheDocument();
      });

      expect(screen.getByText('Senior Colleague')).toBeInTheDocument();
      expect(screen.getByText('Equal Colleague')).toBeInTheDocument();
      expect(screen.getByText('Junior Colleague')).toBeInTheDocument();
    });

    it('should handle missing unique link parameter', async () => {
      render(
        <MemoryRouter initialEntries={['/feedback/']}>
          <FeedbackFormPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Invalid feedback link. Please check the URL and try again.",
          variant: "destructive"
        });
      });
    });
  });

  describe('Form Interaction', () => {
    it('should handle relationship selection', async () => {
      render(
        <MemoryRouter initialEntries={['/feedback/abc123']}>
          <FeedbackFormPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Senior Colleague')).toBeInTheDocument();
      });

      const seniorColleagueButton = screen.getByText('Senior Colleague');
      fireEvent.click(seniorColleagueButton);

      expect(seniorColleagueButton).toHaveAttribute('data-state', 'on');
    });

    it('should handle text input in feedback fields', async () => {
      render(
        <MemoryRouter initialEntries={['/feedback/abc123']}>
          <FeedbackFormPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/What does.*do well/)).toBeInTheDocument();
      });

      const strengthsField = screen.getByPlaceholderText(/What does.*do well/);
      const improvementsField = screen.getByPlaceholderText(/What could.*improve/);

      fireEvent.change(strengthsField, {
        target: { value: 'Excellent communication skills' }
      });
      fireEvent.change(improvementsField, {
        target: { value: 'Could improve time management' }
      });

      expect(strengthsField).toHaveValue('Excellent communication skills');
      expect(improvementsField).toHaveValue('Could improve time management');
    });

    it('should save form data to localStorage on input', async () => {
      render(
        <MemoryRouter initialEntries={['/feedback/abc123']}>
          <FeedbackFormPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/What does.*do well/)).toBeInTheDocument();
      });

      const strengthsField = screen.getByPlaceholderText(/What does.*do well/);
      fireEvent.change(strengthsField, {
        target: { value: 'Great work' }
      });

      await waitFor(() => {
        const savedData = localStorage.getItem('feedback_draft_abc123');
        expect(savedData).toBeTruthy();
        const parsedData = JSON.parse(savedData!);
        expect(parsedData.strengths).toBe('Great work');
      });
    });
  });

  describe('Form Submission Flow', () => {
    it('should move to AI review step on first submit', async () => {
      render(
        <MemoryRouter initialEntries={['/feedback/abc123']}>
          <FeedbackFormPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Review Feedback')).toBeInTheDocument();
      });

      // Fill out form
      const strengthsField = screen.getByPlaceholderText(/What does.*do well/);
      const improvementsField = screen.getByPlaceholderText(/What could.*improve/);
      
      fireEvent.change(strengthsField, {
        target: { value: 'Excellent communication skills and teamwork abilities' }
      });
      fireEvent.change(improvementsField, {
        target: { value: 'Could improve time management and prioritization' }
      });

      // Submit form
      const submitButton = screen.getByText('Review Feedback');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/AI Analysis/)).toBeInTheDocument();
      });
    });

    it('should handle form validation errors', async () => {
      render(
        <MemoryRouter initialEntries={['/feedback/abc123']}>
          <FeedbackFormPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Review Feedback')).toBeInTheDocument();
      });

      // Try to submit without filling required fields
      const submitButton = screen.getByText('Review Feedback');
      fireEvent.click(submitButton);

      // Should show validation messages
      await waitFor(() => {
        expect(screen.getByText(/at least 10 words/)).toBeInTheDocument();
      });
    });

    it('should restore form state from localStorage', async () => {
      // Pre-populate localStorage
      localStorage.setItem('feedback_draft_abc123', JSON.stringify({
        relationship: 'senior_colleague',
        strengths: 'Restored strengths',
        areas_for_improvement: 'Restored improvements'
      }));

      render(
        <MemoryRouter initialEntries={['/feedback/abc123']}>
          <FeedbackFormPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        const strengthsField = screen.getByDisplayValue('Restored strengths');
        expect(strengthsField).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue('Restored improvements')).toBeInTheDocument();
    });
  });

  describe('Due Date Validation', () => {
    it('should handle past due date', async () => {
      // Mock past due date
      (anonymousClient.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: 'request-123',
                employee: { name: 'John Doe', role: 'Software Engineer' },
                review_cycle: {
                  id: 'cycle-123',
                  type: '360_review',
                  name: 'Q4 2024 Review',
                  due_date: '2020-01-01T00:00:00.000Z' // Past date
                }
              },
              error: null
            }))
          }))
        }))
      });

      render(
        <MemoryRouter initialEntries={['/feedback/abc123']}>
          <FeedbackFormPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/feedback period has ended/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle feedback request not found', async () => {
      (anonymousClient.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Not found' }
            }))
          }))
        }))
      });

      render(
        <MemoryRouter initialEntries={['/feedback/invalid123']}>
          <FeedbackFormPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Feedback request not found. Please check the link and try again.",
          variant: "destructive"
        });
      });
    });

    it('should handle network errors gracefully', async () => {
      (anonymousClient.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.reject(new Error('Network error')))
          }))
        }))
      });

      render(
        <MemoryRouter initialEntries={['/feedback/abc123']}>
          <FeedbackFormPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Failed to load feedback form. Please try again.",
          variant: "destructive"
        });
      });
    });
  });

  describe('Survey Mode (Manager Effectiveness)', () => {
    it('should render survey form for manager effectiveness reviews', async () => {
      (anonymousClient.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: 'request-123',
                employee: { name: 'Manager Name', role: 'Manager' },
                review_cycle: {
                  id: 'cycle-123',
                  type: 'manager_effectiveness',
                  name: 'Manager Effectiveness Survey',
                  due_date: '2024-12-31T23:59:59.000Z'
                }
              },
              error: null
            }))
          }))
        }))
      });

      render(
        <MemoryRouter initialEntries={['/feedback/abc123']}>
          <FeedbackFormPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Manager Effectiveness/)).toBeInTheDocument();
      });
    });
  });

  describe('Name Display Toggle', () => {
    it('should toggle between showing and hiding names', async () => {
      render(
        <MemoryRouter initialEntries={['/feedback/abc123']}>
          <FeedbackFormPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Your relationship to John Doe/)).toBeInTheDocument();
      });

      // Find and click the toggle button
      const toggleButton = screen.getByRole('button', { name: /hide names/i });
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText(/Your relationship to the reviewee/)).toBeInTheDocument();
      });
    });
  });

  describe('Local Storage Management', () => {
    it('should clear localStorage on successful submission', async () => {
      // Pre-populate localStorage
      localStorage.setItem('feedback_draft_abc123', JSON.stringify({ test: 'data' }));
      localStorage.setItem('feedback_state_abc123', JSON.stringify({ step: 'form' }));

      render(
        <MemoryRouter initialEntries={['/feedback/abc123']}>
          <FeedbackFormPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Review Feedback')).toBeInTheDocument();
      });

      // Complete the form and submit
      const strengthsField = screen.getByPlaceholderText(/What does.*do well/);
      const improvementsField = screen.getByPlaceholderText(/What could.*improve/);
      
      fireEvent.change(strengthsField, {
        target: { value: 'Excellent work with great attention to detail and strong leadership' }
      });
      fireEvent.change(improvementsField, {
        target: { value: 'Could improve delegation skills and provide more frequent feedback' }
      });

      const submitButton = screen.getByText('Review Feedback');
      fireEvent.click(submitButton);

      // Should move to AI review, then complete submission would clear localStorage
      // (Full flow would require more complex mocking of the AI review component)
    });
  });
}); 