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
  setIsMasterAccount: (isMaster: boolean) => set({ isMasterAccount: isMaster }),
  setViewingAllAccounts: (viewing: boolean) => {
    set({ viewingAllAccounts: viewing });
    localStorage.setItem('masterViewingAllAccounts', viewing.toString());
  },
  checkMasterAccountStatus: async (userId: string) => {
    try {
      // Skip check if userId is not valid
      if (!userId || userId.length < 10) {
        set({ isMasterAccount: false });
        return false;
      }
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to handle "not found" gracefully
      
      // No data means not a master account - not an error
      if (!data) {
        set({ isMasterAccount: false });
        return false;
      }
      
      if (error) {
        console.error('Error checking master account status:', error);
        set({ isMasterAccount: false });
        return false;
      }
      
      const isMaster = data?.role === 'master';
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