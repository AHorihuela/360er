import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';

type AuthState = 'Loading' | 'Authenticated' | 'Unauthenticated';

interface AuthStore {
  authState: AuthState;
  user: User | null;
  isMasterAccount: boolean;
  viewingAllAccounts: boolean;
  setAuthState: (state: AuthState) => void;
  setUser: (user: User | null) => void;
  setIsMasterAccount: (isMaster: boolean) => void;
  setViewingAllAccounts: (viewing: boolean) => void;
  checkMasterAccountStatus: (userId: string) => Promise<boolean>;
}

const useAuthStore = create<AuthStore>((set, get) => ({
  authState: 'Loading',
  user: null,
  isMasterAccount: false,
  viewingAllAccounts: localStorage.getItem('masterViewingAllAccounts') === 'true',
  setAuthState: (state: AuthState) => set({ authState: state }),
  setUser: (user: User | null) => set({ user }),
  setIsMasterAccount: (isMaster: boolean) => {
    set({ isMasterAccount: isMaster });
  },
  setViewingAllAccounts: (viewing: boolean) => {
    set({ viewingAllAccounts: viewing });
    localStorage.setItem('masterViewingAllAccounts', viewing.toString());
    console.log('[AUTH] Master viewing mode changed:', viewing);
  },
  checkMasterAccountStatus: async (userId: string) => {
    if (!userId) {
      console.warn('[AUTH] Invalid userId for master account check:', userId);
      set({ isMasterAccount: false });
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking user role:', error);
        set({ isMasterAccount: false });
        return false;
      }

      if (!data) {
        set({ isMasterAccount: false });
        return false;
      }

      const isMaster = data.role === 'master';
      console.log('[AUTH] Master account status:', { userId: userId.substring(0, 8) + '...', isMaster });
      set({ isMasterAccount: isMaster });
      
      // If user is not a master account, ensure viewingAllAccounts is false
      if (!isMaster && get().viewingAllAccounts) {
        set({ viewingAllAccounts: false });
        localStorage.removeItem('masterViewingAllAccounts');
      }
      
      return isMaster;
    } catch (error) {
      console.error('Error in checkMasterAccountStatus:', error);
      set({ isMasterAccount: false });
      return false;
    }
  }
}));

export function useAuth() {
  const { 
    authState, 
    user, 
    isMasterAccount,
    viewingAllAccounts,
    setAuthState, 
    setUser,
    setIsMasterAccount,
    setViewingAllAccounts,
    checkMasterAccountStatus 
  } = useAuthStore();
  
  return { 
    authState, 
    user, 
    isMasterAccount,
    viewingAllAccounts,
    setAuthState, 
    setUser,
    setIsMasterAccount,
    setViewingAllAccounts,
    checkMasterAccountStatus 
  };
} 