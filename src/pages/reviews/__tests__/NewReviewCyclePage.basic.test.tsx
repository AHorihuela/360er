import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NewReviewCyclePage } from '../NewReviewCyclePage';

// Simple mocks
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: '123' }, error: null }))
        }))
      }))
    }))
  }
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id' }
  }))
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(() => ({ id: 'toast-id', dismiss: vi.fn(), update: vi.fn() })),
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

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('NewReviewCyclePage - Basic Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    expect(screen.getByText('Create New Review Cycle')).toBeInTheDocument();
    expect(screen.getByText('Review Cycle Details')).toBeInTheDocument();
  });

  it('displays all three survey types', () => {
    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    expect(screen.getByText('360° Feedback Review')).toBeInTheDocument();
    expect(screen.getByText('Manager Effectiveness Survey')).toBeInTheDocument();
    expect(screen.getByText('Manager-to-Employee Feedback')).toBeInTheDocument();
  });

  it('has 360 review selected by default', () => {
    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    const radio360 = screen.getByRole('radio', { name: /360° Feedback Review/ });
    expect(radio360).toBeChecked();
  });

  it('shows review by date field for default selection', () => {
    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    expect(screen.getByLabelText('Review By Date')).toBeInTheDocument();
  });

  it('switches survey types when clicked', () => {
    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    const managerRadio = screen.getByRole('radio', { name: /Manager Effectiveness Survey/ });
    fireEvent.click(managerRadio);

    expect(managerRadio).toBeChecked();
  });

  it('hides date field for manager-to-employee feedback', () => {
    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    const managerToEmployeeRadio = screen.getByRole('radio', { name: /Manager-to-Employee Feedback/ });
    fireEvent.click(managerToEmployeeRadio);

    expect(screen.queryByLabelText('Review By Date')).not.toBeInTheDocument();
    expect(screen.getByText('Continuous Feedback Cycle')).toBeInTheDocument();
  });

  it('allows title to be edited', () => {
    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    const titleInput = screen.getByRole('textbox', { name: /title/i });
    fireEvent.change(titleInput, { target: { value: 'My Custom Review' } });

    expect(titleInput).toHaveValue('My Custom Review');
  });

  it('has working navigation buttons', () => {
    render(
      <TestWrapper>
        <NewReviewCyclePage />
      </TestWrapper>
    );

    const backButton = screen.getByRole('button', { name: /Back to Review Cycles/ });
    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith('/reviews');

    const cancelButton = screen.getByRole('button', { name: /Cancel/ });
    fireEvent.click(cancelButton);
    expect(mockNavigate).toHaveBeenCalledWith('/reviews');
  });
}); 