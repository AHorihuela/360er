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
    console.log('[DEBUG] Setting isMasterAccount:', isMaster);
    set({ isMasterAccount: isMaster });
  },
  setViewingAllAccounts: (viewing: boolean) => {
    console.log('[DEBUG] Setting viewingAllAccounts:', viewing);
    set({ viewingAllAccounts: viewing });
    localStorage.setItem('masterViewingAllAccounts', viewing.toString());
  },
  checkMasterAccountStatus: async (userId: string) => {
    try {
      // Skip check if userId is not valid
      if (!userId || userId.length < 10) {
        console.log('[DEBUG] Invalid userId for master account check:', userId);
        set({ isMasterAccount: false });
        return false;
      }
      
      console.log('[DEBUG] Checking master account status for user:', userId);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to handle "not found" gracefully
      
      // No data means not a master account - not an error
      if (!data) {
        console.log('[DEBUG] No user role found - not a master account');
        set({ isMasterAccount: false });
        return false;
      }
      
      if (error) {
        console.error('Error checking master account status:', error);
        set({ isMasterAccount: false });
        return false;
      }
      
      const isMaster = data?.role === 'master';
      console.log('[DEBUG] Master account check result:', { userId, role: data?.role, isMaster });
      set({ isMasterAccount: isMaster });
      
      // If user is not a master account, ensure viewingAllAccounts is false
      if (!isMaster && get().viewingAllAccounts) {
        console.log('[DEBUG] User is not master account, disabling viewingAllAccounts');
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