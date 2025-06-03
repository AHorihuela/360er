import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import * as matchers from '@testing-library/jest-dom/matchers';

import { ProtectedRoute } from '../ProtectedRoute';

// Extend vitest matchers
expect.extend(matchers);

// Mock the useAuth hook
const mockCheckMasterAccountStatus = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}));

// Mock Navigate component to capture redirects
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: (props: any) => {
      mockNavigate(props);
      return <div data-testid="navigate-redirect" {...props} />;
    }
  };
});

describe('ProtectedRoute', () => {
  const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckMasterAccountStatus.mockResolvedValue(true);
    
    // Console spy to suppress debug logs during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderProtectedRoute = (initialPath = '/dashboard') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </MemoryRouter>
    );
  };

  describe('Loading States', () => {
    it('shows loading when auth state is Loading', () => {
      mockUseAuth.mockReturnValue({
        authState: 'Loading',
        user: null,
        isMasterAccount: false,
        checkMasterAccountStatus: mockCheckMasterAccountStatus
      });

      renderProtectedRoute();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('shows loading when authenticated but master account status not checked', () => {
      mockUseAuth.mockReturnValue({
        authState: 'Authenticated',
        user: { id: 'user-123', email: 'test@example.com' },
        isMasterAccount: false,
        checkMasterAccountStatus: mockCheckMasterAccountStatus
      });

      renderProtectedRoute();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('Authentication States', () => {
    it('redirects to login when unauthenticated', () => {
      mockUseAuth.mockReturnValue({
        authState: 'Unauthenticated',
        user: null,
        isMasterAccount: false,
        checkMasterAccountStatus: mockCheckMasterAccountStatus
      });

      renderProtectedRoute('/dashboard');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/login',
        state: { from: '/dashboard' },
        replace: true
      });
    });

    it('redirects with different paths correctly', () => {
      mockUseAuth.mockReturnValue({
        authState: 'Unauthenticated',
        user: null,
        isMasterAccount: false,
        checkMasterAccountStatus: mockCheckMasterAccountStatus
      });

      renderProtectedRoute('/employees');

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/login',
        state: { from: '/employees' },
        replace: true
      });
    });
  });

  describe('Successful Authentication Flow', () => {
    it('renders protected content after successful authentication and master account check', async () => {
      mockUseAuth.mockReturnValue({
        authState: 'Authenticated',
        user: { id: 'user-123', email: 'test@example.com' },
        isMasterAccount: true,
        checkMasterAccountStatus: mockCheckMasterAccountStatus
      });

      renderProtectedRoute();

      // Wait for master account check to complete
      await waitFor(() => {
        expect(mockCheckMasterAccountStatus).toHaveBeenCalledWith('user-123');
      });

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('calls checkMasterAccountStatus with correct user ID', async () => {
      const userId = 'test-user-456';
      mockUseAuth.mockReturnValue({
        authState: 'Authenticated',
        user: { id: userId, email: 'test@example.com' },
        isMasterAccount: false,
        checkMasterAccountStatus: mockCheckMasterAccountStatus
      });

      renderProtectedRoute();

      await waitFor(() => {
        expect(mockCheckMasterAccountStatus).toHaveBeenCalledWith(userId);
      });
    });
  });

  describe('Master Account Check Error Handling', () => {
    it('still allows access when master account check fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCheckMasterAccountStatus.mockRejectedValue(new Error('Network error'));
      
      mockUseAuth.mockReturnValue({
        authState: 'Authenticated',
        user: { id: 'user-123', email: 'test@example.com' },
        isMasterAccount: false,
        checkMasterAccountStatus: mockCheckMasterAccountStatus
      });

      renderProtectedRoute();

      await waitFor(() => {
        expect(mockCheckMasterAccountStatus).toHaveBeenCalledWith('user-123');
      });

      // Should still render content even if master account check fails
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error checking master account status in ProtectedRoute:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('handles master account check timeout gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCheckMasterAccountStatus.mockRejectedValue(new Error('Request timeout'));
      
      mockUseAuth.mockReturnValue({
        authState: 'Authenticated',
        user: { id: 'user-123', email: 'test@example.com' },
        isMasterAccount: false,
        checkMasterAccountStatus: mockCheckMasterAccountStatus
      });

      renderProtectedRoute();

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error checking master account status in ProtectedRoute:',
        expect.objectContaining({ message: 'Request timeout' })
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('handles user without ID', () => {
      mockUseAuth.mockReturnValue({
        authState: 'Authenticated',
        user: { email: 'test@example.com' }, // No ID
        isMasterAccount: false,
        checkMasterAccountStatus: mockCheckMasterAccountStatus
      });

      renderProtectedRoute();

      // Should not call checkMasterAccountStatus without user ID
      expect(mockCheckMasterAccountStatus).not.toHaveBeenCalled();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('handles null user', () => {
      mockUseAuth.mockReturnValue({
        authState: 'Authenticated',
        user: null,
        isMasterAccount: false,
        checkMasterAccountStatus: mockCheckMasterAccountStatus
      });

      renderProtectedRoute();

      expect(mockCheckMasterAccountStatus).not.toHaveBeenCalled();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('does not call master account check when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        authState: 'Unauthenticated',
        user: { id: 'user-123', email: 'test@example.com' },
        isMasterAccount: false,
        checkMasterAccountStatus: mockCheckMasterAccountStatus
      });

      renderProtectedRoute();

      expect(mockCheckMasterAccountStatus).not.toHaveBeenCalled();
    });
  });

  describe('Component Lifecycle', () => {
    it('re-checks master account status when user changes', async () => {
      // Start with first user
      mockUseAuth.mockReturnValue({
        authState: 'Authenticated',
        user: { id: 'user-1', email: 'user1@example.com' },
        isMasterAccount: false,
        checkMasterAccountStatus: mockCheckMasterAccountStatus
      });

      const { rerender } = renderProtectedRoute('/dashboard');

      await waitFor(() => {
        expect(mockCheckMasterAccountStatus).toHaveBeenCalledWith('user-1');
      });

      // Change to second user
      mockCheckMasterAccountStatus.mockClear();
      mockUseAuth.mockReturnValue({
        authState: 'Authenticated',
        user: { id: 'user-2', email: 'user2@example.com' },
        isMasterAccount: false,
        checkMasterAccountStatus: mockCheckMasterAccountStatus
      });

      rerender(
        <MemoryRouter initialEntries={['/dashboard']}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockCheckMasterAccountStatus).toHaveBeenCalledWith('user-2');
      });
    });

    it('resets master status check when auth state changes to unauthenticated', async () => {
      // Start authenticated
      mockUseAuth.mockReturnValue({
        authState: 'Authenticated',
        user: { id: 'user-1', email: 'user1@example.com' },
        isMasterAccount: false,
        checkMasterAccountStatus: mockCheckMasterAccountStatus
      });

      const { rerender } = renderProtectedRoute('/dashboard');

      await waitFor(() => {
        expect(mockCheckMasterAccountStatus).toHaveBeenCalledWith('user-1');
      });

      // Then become unauthenticated
      mockUseAuth.mockReturnValue({
        authState: 'Unauthenticated',
        user: null,
        isMasterAccount: false,
        checkMasterAccountStatus: mockCheckMasterAccountStatus
      });

      rerender(
        <MemoryRouter initialEntries={['/dashboard']}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );

      // Should redirect to login
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/login',
        state: { from: '/dashboard' },
        replace: true
      });
    });
  });
}); 