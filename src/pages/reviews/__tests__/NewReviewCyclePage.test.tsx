import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NewReviewCyclePage } from '../NewReviewCyclePage';

// Mock the dependencies
vi.mock('@/lib/supabase', () => {
  const mockSingle = vi.fn(() => Promise.resolve({ data: { id: '123' }, error: null }));
  const mockSelect = vi.fn(() => ({ single: mockSingle }));
  const mockInsert = vi.fn(() => ({ select: mockSelect }));
  const mockFrom = vi.fn(() => ({ insert: mockInsert }));

  return {
    supabase: { from: mockFrom }
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id' }
  }))
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(() => ({ id: 'mock-toast-id', dismiss: vi.fn(), update: vi.fn() })),
    dismiss: vi.fn(),
    toasts: []
  }))
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Test wrapper with router
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('NewReviewCyclePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page with default 360 review selected', () => {
    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    expect(screen.getByText('Create New Review Cycle')).toBeInTheDocument();
    expect(screen.getByText('Review Cycle Details')).toBeInTheDocument();
    expect(screen.getByText('Survey Type')).toBeInTheDocument();
    
    // Check that 360 review is selected by default
    const radio360 = screen.getByRole('radio', { name: /360° Feedback Review/ });
    expect(radio360).toBeChecked();
  });

  it('displays correct survey type options with icons and badges', () => {
    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    // Check all three survey types are present
    expect(screen.getByText('360° Feedback Review')).toBeInTheDocument();
    expect(screen.getByText('Manager Effectiveness Survey')).toBeInTheDocument();
    expect(screen.getByText('Manager-to-Employee Feedback')).toBeInTheDocument();

    // Check badges
    expect(screen.getByText('360° Review')).toBeInTheDocument();
    expect(screen.getByText('Management')).toBeInTheDocument();
    expect(screen.getByText('Continuous')).toBeInTheDocument();
  });

  it('updates form data when survey type changes', async () => {
    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    // Select manager effectiveness
    const managerRadio = screen.getByRole('radio', { name: /Manager Effectiveness Survey/ });
    fireEvent.click(managerRadio);

    await waitFor(() => {
      expect(managerRadio).toBeChecked();
    });

    // Check that title field updates
    const titleInput = screen.getByDisplayValue(/Manager Survey/);
    expect(titleInput).toBeInTheDocument();
  });

  it('handles manager-to-employee selection correctly', async () => {
    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    // Select manager-to-employee
    const managerToEmployeeRadio = screen.getByRole('radio', { name: /Manager-to-Employee Feedback/ });
    fireEvent.click(managerToEmployeeRadio);

    await waitFor(() => {
      expect(managerToEmployeeRadio).toBeChecked();
    });

    // Check that title updates and date field is hidden
    const titleInput = screen.getByDisplayValue('Manager to Employee Feedback');
    expect(titleInput).toBeInTheDocument();

    // Date field should be hidden for continuous feedback
    expect(screen.queryByLabelText('Review By Date')).not.toBeInTheDocument();

    // Continuous feedback explanation should be visible
    expect(screen.getByText('Continuous Feedback Cycle')).toBeInTheDocument();
  });

  it('shows review by date field for structured surveys', () => {
    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    // Default 360 review should show date field
    expect(screen.getByLabelText('Review By Date')).toBeInTheDocument();

    // Switch to manager effectiveness
    const managerRadio = screen.getByRole('radio', { name: /Manager Effectiveness Survey/ });
    fireEvent.click(managerRadio);

    // Date field should still be visible
    expect(screen.getByLabelText('Review By Date')).toBeInTheDocument();
  });

  it('opens popover with sample questions when info icon is clicked', async () => {
    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    // Find and click info icon for 360 review
    const infoButtons = screen.getAllByRole('button', { name: /View sample questions/ });
    expect(infoButtons).toHaveLength(3); // One for each survey type

    fireEvent.click(infoButtons[0]); // Click first one (360 review)

    await waitFor(() => {
      expect(screen.getByText('Sample Questions')).toBeInTheDocument();
      expect(screen.getByText("What are this person's strengths?")).toBeInTheDocument();
    });
  });

  it('allows title input to be edited', () => {
    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    const titleInput = screen.getByRole('textbox', { name: /title/i });
    fireEvent.change(titleInput, { target: { value: 'Custom Review Title' } });

    expect(titleInput).toHaveValue('Custom Review Title');
  });

  it('allows date input to be edited for structured surveys', () => {
    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    const dateInput = screen.getByLabelText('Review By Date');
    fireEvent.change(dateInput, { target: { value: '2024-12-31' } });

    expect(dateInput).toHaveValue('2024-12-31');
  });

  it('submits form with correct data', async () => {
    const { supabase } = await import('@/lib/supabase');
    const { useToast } = await import('@/components/ui/use-toast');
    const mockToastReturn = vi.mocked(useToast)();

    // Ensure the mock returns success
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: '123' }, error: null }))
        }))
      }))
    } as any);

    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    // Fill in form
    const titleInput = screen.getByRole('textbox', { name: /title/i });
    fireEvent.change(titleInput, { target: { value: 'Test Review Cycle' } });

    const dateInput = screen.getByLabelText('Review By Date');
    fireEvent.change(dateInput, { target: { value: '2024-12-31' } });

    // Submit form via button click (real user interaction)
    const submitButton = screen.getByRole('button', { name: /Create Review Cycle/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('review_cycles');
      expect(mockToastReturn.toast).toHaveBeenCalledWith({
        title: "Success",
        description: "Review cycle created successfully",
      });
      expect(mockNavigate).toHaveBeenCalledWith('/reviews');
    });
  });

  it('handles form submission errors', async () => {
    const { supabase } = await import('@/lib/supabase');
    const { useToast } = await import('@/components/ui/use-toast');
    const mockToastReturn = vi.mocked(useToast)();

    // Mock error response with proper method chaining
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Database error' } }))
        }))
      }))
    } as any);

    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    // Submit form via button click (real user interaction)
    const submitButton = screen.getByRole('button', { name: /Create Review Cycle/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToastReturn.toast).toHaveBeenCalledWith({
        title: "Error",
        description: "Failed to create review cycle",
        variant: "destructive",
      });
    });
  });

  it('navigates back when back button is clicked', () => {
    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    const backButton = screen.getByRole('button', { name: /Back to Review Cycles/ });
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/reviews');
  });

  it('navigates back when cancel button is clicked', () => {
    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/ });
    fireEvent.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith('/reviews');
  });

  it('shows tooltip for survey type help', async () => {
    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    const helpIcon = screen.getByRole('button', { name: /Survey type info/i });
    
    // Trigger tooltip with click instead of mouseEnter for better test reliability
    fireEvent.click(helpIcon);

    await waitFor(() => {
      // Use a more flexible text matcher
      expect(screen.getByText(/Choose the type of feedback collection/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('prevents form submission when required fields are empty', () => {
    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    // Clear the title
    const titleInput = screen.getByRole('textbox', { name: /title/i });
    fireEvent.change(titleInput, { target: { value: '' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Create Review Cycle/ });
    fireEvent.click(submitButton);

    // Form should not be submitted (required validation)
    expect(titleInput).toBeInvalid();
  });

  it('shows loading state during form submission', async () => {
    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    const submitButton = screen.getByRole('button', { name: /Create Review Cycle/ });
    fireEvent.click(submitButton);

    // Check for loading state
    expect(screen.getByText('Creating...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Creating...')).not.toBeInTheDocument();
    });
  });
});