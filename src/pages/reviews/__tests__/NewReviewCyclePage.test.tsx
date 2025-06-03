import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import * as matchers from '@testing-library/jest-dom/matchers';
import { NewReviewCyclePage } from '../NewReviewCyclePage';

// Extend expect with jest-dom matchers
expect.extend(matchers);

// Mock dependencies
const mockNavigate = vi.fn();
const mockToast = vi.fn();
const mockUser = {
  id: 'user-123',
  email: 'test@example.com'
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

// Mock Supabase
const mockSupabaseFrom = vi.fn();
const mockSupabaseInsert = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseSingle = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockSupabaseFrom,
  },
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('NewReviewCyclePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default Supabase mocks
    mockSupabaseFrom.mockReturnValue({
      insert: mockSupabaseInsert,
    });

    mockSupabaseInsert.mockReturnValue({
      select: mockSupabaseSelect,
    });

    mockSupabaseSelect.mockReturnValue({
      single: mockSupabaseSingle,
    });

    mockSupabaseSingle.mockResolvedValue({
      data: {
        id: 'cycle-123',
        title: 'Test Review Cycle',
        review_by_date: '2023-12-31',
        user_id: 'user-123',
        status: 'active',
        type: '360_review'
      },
      error: null
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the main page elements', () => {
      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      expect(screen.getByText('Create New Review Cycle')).toBeInTheDocument();
      expect(screen.getByText('Back to Review Cycles')).toBeInTheDocument();
      expect(screen.getByText('Review Cycle Details')).toBeInTheDocument();
      expect(screen.getByText('Configure the details for your new feedback collection cycle.')).toBeInTheDocument();
    });

    it('should display survey type options', () => {
      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      expect(screen.getByText('360° Feedback Review')).toBeInTheDocument();
      expect(screen.getByText('Manager Effectiveness Survey')).toBeInTheDocument();
      expect(screen.getByText('Collect comprehensive feedback about team members from multiple perspectives.')).toBeInTheDocument();
      expect(screen.getByText('Gather feedback specifically about management skills and leadership qualities.')).toBeInTheDocument();
    });

    it('should have default form values', () => {
      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      // Should default to 360° review
      const radio360 = screen.getByLabelText(/360° Feedback Review/);
      expect(radio360).toBeChecked();

      // Should have default title with current date
      const titleInput = screen.getByLabelText('Title');
      expect(titleInput).toHaveValue(expect.stringContaining('360° Review -'));

      // Should have default date 30 days from now
      const dateInput = screen.getByLabelText('Review By Date');
      expect(dateInput).toHaveAttribute('type', 'date');
    });
  });

  describe('Survey Type Selection', () => {
    it('should allow switching between survey types', () => {
      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      const radio360 = screen.getByLabelText(/360° Feedback Review/);
      const radioManager = screen.getByLabelText(/Manager Effectiveness Survey/);

      // Initially 360° should be selected
      expect(radio360).toBeChecked();
      expect(radioManager).not.toBeChecked();

      // Switch to manager effectiveness
      fireEvent.click(radioManager);

      expect(radioManager).toBeChecked();
      expect(radio360).not.toBeChecked();
    });

    it('should update title when survey type changes', () => {
      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
      const radioManager = screen.getByLabelText(/Manager Effectiveness Survey/);

      // Initially should have 360° title
      expect(titleInput.value).toContain('360° Review -');

      // Switch to manager effectiveness
      fireEvent.click(radioManager);

      // Title should update
      expect(titleInput.value).toContain('Manager Survey -');
    });

    it('should display correct sample questions for each survey type', () => {
      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      // 360° review questions should be visible initially
      expect(screen.getByText("What are this person's strengths?")).toBeInTheDocument();
      expect(screen.getByText("What are areas for improvement for this person?")).toBeInTheDocument();

      // Switch to manager effectiveness
      const radioManager = screen.getByLabelText(/Manager Effectiveness Survey/);
      fireEvent.click(radioManager);

      // Manager effectiveness questions should be visible
      expect(screen.getByText('I understand what is expected of me at work.')).toBeInTheDocument();
      expect(screen.getByText('My manager contributes to my productivity.')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should require title field', () => {
      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      const titleInput = screen.getByLabelText('Title');
      expect(titleInput).toHaveAttribute('required');
    });

    it('should require review by date field', () => {
      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      const dateInput = screen.getByLabelText('Review By Date');
      expect(dateInput).toHaveAttribute('required');
    });

    it('should show correct placeholder text for each survey type', () => {
      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      const titleInput = screen.getByLabelText('Title');
      
      // Initially 360° placeholder
      expect(titleInput).toHaveAttribute('placeholder', 'Q4 2023 Performance Review');

      // Switch to manager effectiveness
      const radioManager = screen.getByLabelText(/Manager Effectiveness Survey/);
      fireEvent.click(radioManager);

      // Manager effectiveness placeholder
      expect(titleInput).toHaveAttribute('placeholder', '2023 Manager Effectiveness Survey');
    });
  });

  describe('Form Submission', () => {
    it('should submit review cycle with correct data', async () => {
      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      const titleInput = screen.getByLabelText('Title');
      const dateInput = screen.getByLabelText('Review By Date');
      const submitButton = screen.getByText('Create Review Cycle');

      // Fill out form
      fireEvent.change(titleInput, {
        target: { value: 'Custom Review Cycle' }
      });
      fireEvent.change(dateInput, {
        target: { value: '2023-12-31' }
      });

      // Submit form
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSupabaseInsert).toHaveBeenCalledWith({
          title: 'Custom Review Cycle',
          review_by_date: '2023-12-31',
          user_id: 'user-123',
          status: 'active',
          type: '360_review'
        });
      });
    });

    it('should submit manager effectiveness survey with correct type', async () => {
      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      const radioManager = screen.getByLabelText(/Manager Effectiveness Survey/);
      const submitButton = screen.getByText('Create Review Cycle');

      // Select manager effectiveness
      fireEvent.click(radioManager);

      // Submit form
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSupabaseInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'manager_effectiveness'
          })
        );
      });
    });

    it('should show success message and navigate on successful submission', async () => {
      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      const submitButton = screen.getByText('Create Review Cycle');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Success",
          description: "Review cycle created successfully",
        });
        expect(mockNavigate).toHaveBeenCalledWith('/reviews');
      });
    });

    it('should handle submission errors', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      const submitButton = screen.getByText('Create Review Cycle');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Failed to create review cycle",
          variant: "destructive",
        });
      });
    });

    it('should show loading state during submission', async () => {
      // Mock slow response
      mockSupabaseSingle.mockImplementation(
        () => new Promise(resolve => 
          setTimeout(() => resolve({ data: {}, error: null }), 100)
        )
      );

      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      const submitButton = screen.getByText('Create Review Cycle');
      fireEvent.click(submitButton);

      expect(screen.getByText('Creating...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Create Review Cycle')).toBeInTheDocument();
      });
    });

    it('should disable form during submission', async () => {
      // Mock slow response
      mockSupabaseSingle.mockImplementation(
        () => new Promise(resolve => 
          setTimeout(() => resolve({ data: {}, error: null }), 100)
        )
      );

      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      const submitButton = screen.getByText('Create Review Cycle');
      fireEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
    });
  });

  describe('Navigation', () => {
    it('should navigate back to reviews when back button is clicked', () => {
      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      const backButton = screen.getByText('Back to Review Cycles');
      fireEvent.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/reviews');
    });

    it('should navigate back to reviews when cancel button is clicked', () => {
      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalledWith('/reviews');
    });
  });

  describe('Form Input Handling', () => {
    it('should update title input correctly', () => {
      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      const titleInput = screen.getByLabelText('Title') as HTMLInputElement;

      fireEvent.change(titleInput, {
        target: { value: 'New Title' }
      });

      expect(titleInput.value).toBe('New Title');
    });

    it('should update date input correctly', () => {
      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      const dateInput = screen.getByLabelText('Review By Date') as HTMLInputElement;

      fireEvent.change(dateInput, {
        target: { value: '2024-01-15' }
      });

      expect(dateInput.value).toBe('2024-01-15');
    });

    it('should preserve custom title when switching survey types', () => {
      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
      const radioManager = screen.getByLabelText(/Manager Effectiveness Survey/);

      // Set a custom title
      fireEvent.change(titleInput, {
        target: { value: 'Custom Title' }
      });

      // Switch survey type - this should NOT change the custom title
      fireEvent.click(radioManager);

      // Custom title should be preserved
      expect(titleInput.value).toBe('Custom Title');
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      expect(screen.getByLabelText('Title')).toBeInTheDocument();
      expect(screen.getByLabelText('Review By Date')).toBeInTheDocument();
    });

    it('should have accessible radio buttons', () => {
      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      const radio360 = screen.getByRole('radio', { name: /360° Feedback Review/ });
      const radioManager = screen.getByRole('radio', { name: /Manager Effectiveness Survey/ });

      expect(radio360).toBeInTheDocument();
      expect(radioManager).toBeInTheDocument();
    });

    it('should have tooltip for survey type help', () => {
      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      const helpButton = screen.getByRole('button', { name: /Survey type info/ });
      expect(helpButton).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing user gracefully', () => {
      // Remock useAuth to return null user
      vi.mocked(require('@/hooks/useAuth').useAuth).mockReturnValue({
        user: null,
      });

      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      const submitButton = screen.getByText('Create Review Cycle');
      fireEvent.click(submitButton);

      // Should not attempt to submit without user
      expect(mockSupabaseInsert).not.toHaveBeenCalled();
    });

    it('should handle date calculation correctly', () => {
      // Mock current date to ensure consistent test results
      const mockDate = new Date('2023-06-01T00:00:00Z');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      const dateInput = screen.getByLabelText('Review By Date') as HTMLInputElement;

      // Should be 30 days from mock date (2023-07-01)
      expect(dateInput.value).toBe('2023-07-01');

      vi.restoreAllMocks();
    });

    it('should handle form submission without authentication', async () => {
      // Remock useAuth to return user with null id
      vi.mocked(require('@/hooks/useAuth').useAuth).mockReturnValue({
        user: { id: null },
      });

      render(<NewReviewCyclePage />, { wrapper: TestWrapper });

      const submitButton = screen.getByText('Create Review Cycle');
      fireEvent.click(submitButton);

      // Should not call Supabase without user ID
      expect(mockSupabaseInsert).not.toHaveBeenCalled();
    });
  });
});