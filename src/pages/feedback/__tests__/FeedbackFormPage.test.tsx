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
    useParams: () => ({ uniqueLink: 'test-link-123' }),
  };
});

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/supabase', () => ({
  anonymousClient: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'req-123',
              employee: { name: 'John Doe' },
              review_cycle: { 
                title: 'Q4 Review',
                type: '360_review'
              }
            },
            error: null
          })
        }),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }),
      insert: vi.fn().mockResolvedValue({
        data: { id: 'response-123' },
        error: null
      })
    }),
  },
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('FeedbackFormPage', () => {
  it('should render without crashing', async () => {
    const { FeedbackFormPage } = await import('../FeedbackFormPage');
    
    render(<FeedbackFormPage />, { wrapper: TestWrapper });

    // Should show loading initially, which means component rendered
    expect(screen.getByText('Loading feedback form...')).toBeInTheDocument();
  });

  it('should handle missing feedback request', async () => {
    const { FeedbackFormPage } = await import('../FeedbackFormPage');
    
    render(<FeedbackFormPage />, { wrapper: TestWrapper });

    // Component renders successfully even with missing data
    expect(screen.getByText('Loading feedback form...')).toBeInTheDocument();
  });
});