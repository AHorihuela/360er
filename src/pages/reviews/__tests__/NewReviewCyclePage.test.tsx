import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend expect with jest-dom matchers
expect.extend(matchers);

// Mock dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ employeeId: 'emp-123' }),
  };
});

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
  }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'emp-123', name: 'John Doe', role: 'Engineer' }],
          error: null
        })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'review-123' },
            error: null
          })
        })
      })
    }),
  },
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('NewReviewCyclePage', () => {
  it('should render without crashing', async () => {
    const { NewReviewCyclePage } = await import('../NewReviewCyclePage');
    
    render(<NewReviewCyclePage />, { wrapper: TestWrapper });

    expect(screen.getByText('Create New Review Cycle')).toBeInTheDocument();
  });

  it('should show survey type selection', async () => {
    const { NewReviewCyclePage } = await import('../NewReviewCyclePage');
    
    render(<NewReviewCyclePage />, { wrapper: TestWrapper });

    expect(screen.getByText('360° Review')).toBeInTheDocument();
    expect(screen.getByText('Manager Effectiveness Survey')).toBeInTheDocument();
  });
});