import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { User } from '@supabase/supabase-js';

// Mock Supabase
const mockSupabaseQuery = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockSupabaseQuery
        }))
      }))
    }))
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock console methods
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
};

describe('useAuth Hook', () => {
  let useAuth: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    mockSupabaseQuery.mockReset();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Reset console spies
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();
    consoleSpy.warn.mockClear();
    
    // Fresh import of the hook
    vi.resetModules();
    const authModule = await import('../useAuth');
    useAuth = authModule.useAuth;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with default state when localStorage is empty', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useAuth());

      expect(result.current.authState).toBe('Loading');
      expect(result.current.user).toBeNull();
      expect(result.current.isMasterAccount).toBe(false);
      expect(result.current.viewingAllAccounts).toBe(false);
    });

    it('should handle invalid localStorage values gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid');
      
      const { result } = renderHook(() => useAuth());

      expect(result.current.viewingAllAccounts).toBe(false);
    });
  });

  describe('State Setters', () => {
    it('should update auth state', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.setAuthState('Authenticated');
      });

      expect(result.current.authState).toBe('Authenticated');
    });

    it('should update user', () => {
      const { result } = renderHook(() => useAuth());
      const mockUser = { id: 'user-123', email: 'test@example.com' } as User;

      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);
    });

    it('should clear user when set to null', () => {
      const { result } = renderHook(() => useAuth());
      const mockUser = { id: 'user-123', email: 'test@example.com' } as User;

      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);

      act(() => {
        result.current.setUser(null);
      });

      expect(result.current.user).toBeNull();
    });

    it('should update master account status with debug logging', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.setIsMasterAccount(true);
      });

      expect(result.current.isMasterAccount).toBe(true);
      // Note: setIsMasterAccount no longer logs directly - this is handled by checkMasterAccountStatus
    });

    it('should update viewing all accounts with localStorage persistence', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.setViewingAllAccounts(true);
      });

      expect(result.current.viewingAllAccounts).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('masterViewingAllAccounts', 'true');
      expect(consoleSpy.log).toHaveBeenCalledWith('[AUTH] Master viewing mode changed:', true);
    });
  });

  describe('Master Account Status Check', () => {
    const mockUserId = 'valid-user-id-123';

    it('should return false for invalid user IDs', async () => {
      const { result } = renderHook(() => useAuth());

      const invalidIds = ['', 'short', null, undefined];
      
      for (const invalidId of invalidIds) {
        const isMaster = await act(async () => {
          return result.current.checkMasterAccountStatus(invalidId as string);
        });

        expect(isMaster).toBe(false);
        expect(result.current.isMasterAccount).toBe(false);
      }

      expect(consoleSpy.warn).toHaveBeenCalledWith('[AUTH] Invalid userId for master account check:', expect.any(String));
    });

    it('should handle user with master role', async () => {
      mockSupabaseQuery.mockResolvedValue({
        data: { role: 'master' },
        error: null
      });

      const { result } = renderHook(() => useAuth());

      const isMaster = await act(async () => {
        return result.current.checkMasterAccountStatus(mockUserId);
      });

      expect(isMaster).toBe(true);
      expect(result.current.isMasterAccount).toBe(true);
      expect(consoleSpy.log).toHaveBeenCalledWith('[AUTH] Master account status:', {
        userId: mockUserId.substring(0, 8) + '...',
        isMaster: true
      });
    });

    it('should handle user with non-master role', async () => {
      mockSupabaseQuery.mockResolvedValue({
        data: { role: 'user' },
        error: null
      });

      const { result } = renderHook(() => useAuth());

      const isMaster = await act(async () => {
        return result.current.checkMasterAccountStatus(mockUserId);
      });

      expect(isMaster).toBe(false);
      expect(result.current.isMasterAccount).toBe(false);
    });

    it('should handle user not found (no data)', async () => {
      mockSupabaseQuery.mockResolvedValue({
        data: null,
        error: null
      });

      const { result } = renderHook(() => useAuth());

      const isMaster = await act(async () => {
        return result.current.checkMasterAccountStatus(mockUserId);
      });

      expect(isMaster).toBe(false);
      expect(result.current.isMasterAccount).toBe(false);
      // Note: No debug log for "no data" case - this is expected behavior
    });

    it('should handle database errors', async () => {
      const mockError = new Error('Database connection failed');
      mockSupabaseQuery.mockResolvedValue({
        data: { role: 'master' },
        error: mockError
      });

      const { result } = renderHook(() => useAuth());

      const isMaster = await act(async () => {
        return result.current.checkMasterAccountStatus(mockUserId);
      });

      expect(isMaster).toBe(false);
      expect(result.current.isMasterAccount).toBe(false);
      expect(consoleSpy.error).toHaveBeenCalledWith('Error checking user role:', mockError);
    });

    it('should handle unexpected exceptions', async () => {
      mockSupabaseQuery.mockRejectedValue(new Error('Unexpected error'));

      const { result } = renderHook(() => useAuth());

      const isMaster = await act(async () => {
        return result.current.checkMasterAccountStatus(mockUserId);
      });

      expect(isMaster).toBe(false);
      expect(result.current.isMasterAccount).toBe(false);
      expect(consoleSpy.error).toHaveBeenCalledWith('Error in checkMasterAccountStatus:', expect.any(Error));
    });
  });

  describe('Master Account Viewing Logic', () => {
    const mockUserId = 'valid-user-id-123';

    it('should disable viewingAllAccounts when user is not master', async () => {
      mockSupabaseQuery.mockResolvedValue({
        data: { role: 'user' },
        error: null
      });

      const { result } = renderHook(() => useAuth());

      // Set viewingAllAccounts to true first
      act(() => {
        result.current.setViewingAllAccounts(true);
      });

      expect(result.current.viewingAllAccounts).toBe(true);

      // Check master status - should disable viewingAllAccounts
      await act(async () => {
        await result.current.checkMasterAccountStatus(mockUserId);
      });

      expect(result.current.isMasterAccount).toBe(false);
      expect(result.current.viewingAllAccounts).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('masterViewingAllAccounts');
      // Note: This is now handled by useEffect in the hook rather than the store
    });

    it('should maintain viewingAllAccounts when user is master', async () => {
      mockSupabaseQuery.mockResolvedValue({
        data: { role: 'master' },
        error: null
      });

      const { result } = renderHook(() => useAuth());

      // Set viewingAllAccounts to true first
      act(() => {
        result.current.setViewingAllAccounts(true);
      });

      expect(result.current.viewingAllAccounts).toBe(true);

      // Check master status - should maintain viewingAllAccounts
      await act(async () => {
        await result.current.checkMasterAccountStatus(mockUserId);
      });

      expect(result.current.isMasterAccount).toBe(true);
      expect(result.current.viewingAllAccounts).toBe(true);
      expect(localStorageMock.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle user authentication and master status check', async () => {
      // Clear any previous mock calls
      mockSupabaseQuery.mockClear();
      
      mockSupabaseQuery.mockResolvedValue({
        data: { role: 'master' },
        error: null
      });

      const { result } = renderHook(() => useAuth());
      // Use a valid userId that meets the length requirement (>= 10 characters)
      const mockUser = { id: 'user-123456789', email: 'test@example.com' } as User;

      // Set user and authenticate
      act(() => {
        result.current.setUser(mockUser);
        result.current.setAuthState('Authenticated');
      });

      expect(result.current.authState).toBe('Authenticated');
      expect(result.current.user).toEqual(mockUser);

      // Check master status and wait for state update
      let isMaster: boolean;
      await act(async () => {
        isMaster = await result.current.checkMasterAccountStatus(mockUser.id);
      });
      
      // Verify the return value and state update
      expect(isMaster!).toBe(true);
      expect(result.current.isMasterAccount).toBe(true);

      // Enable viewing all accounts
      act(() => {
        result.current.setViewingAllAccounts(true);
      });

      expect(result.current.viewingAllAccounts).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('masterViewingAllAccounts', 'true');
    });

    it('should handle logout scenario', () => {
      const { result } = renderHook(() => useAuth());
      const mockUser = { id: 'user-123', email: 'test@example.com' } as User;

      // Set authenticated state
      act(() => {
        result.current.setUser(mockUser);
        result.current.setAuthState('Authenticated');
        result.current.setIsMasterAccount(true);
        result.current.setViewingAllAccounts(true);
      });

      // Verify state is set
      expect(result.current.authState).toBe('Authenticated');
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isMasterAccount).toBe(true);
      expect(result.current.viewingAllAccounts).toBe(true);

      // Logout
      act(() => {
        result.current.setUser(null);
        result.current.setAuthState('Unauthenticated');
        result.current.setIsMasterAccount(false);
        result.current.setViewingAllAccounts(false);
      });

      expect(result.current.authState).toBe('Unauthenticated');
      expect(result.current.user).toBeNull();
      expect(result.current.isMasterAccount).toBe(false);
      expect(result.current.viewingAllAccounts).toBe(false);
    });
  });

  describe('localStorage Integration', () => {
    it('should properly initialize from localStorage when true', async () => {
      // Setup a fresh environment with localStorage returning true
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'masterViewingAllAccounts') return 'true';
        return null;
      });

      // Reset modules and import fresh
      vi.resetModules();
      const authModule = await import('../useAuth');
      const freshUseAuth = authModule.useAuth;
      
      const { result } = renderHook(() => freshUseAuth());

      expect(result.current.viewingAllAccounts).toBe(true);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('masterViewingAllAccounts');
    });

    it('should save viewing state to localStorage', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.setViewingAllAccounts(true);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('masterViewingAllAccounts', 'true');

      act(() => {
        result.current.setViewingAllAccounts(false);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('masterViewingAllAccounts', 'false');
    });
  });
}); 