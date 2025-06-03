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
  };
});

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
    isMasterAccount: false,
    viewingAllAccounts: false
  }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
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

describe('EmployeesPage', () => {
  it('should render without crashing', async () => {
    const { EmployeesPage } = await import('../EmployeesPage');
    
    render(<EmployeesPage />, { wrapper: TestWrapper });

    expect(screen.getByText('Team Members')).toBeInTheDocument();
    expect(screen.getByText('Manage your team members')).toBeInTheDocument();
  });

  it('should show add team member button', async () => {
    const { EmployeesPage } = await import('../EmployeesPage');
    
    render(<EmployeesPage />, { wrapper: TestWrapper });

    expect(screen.getByText('Add Team Member')).toBeInTheDocument();
  });
});