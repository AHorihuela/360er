import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthState = 'Loading' | 'Authenticated' | 'Unauthenticated';

interface AuthStore {
  authState: AuthState;
  user: User | null;
  isMasterAccount: boolean;
  setAuthState: (state: AuthState) => void;
  setUser: (user: User | null) => void;
  setIsMasterAccount: (isMaster: boolean) => void;
  checkMasterAccountStatus: (userId: string) => Promise<boolean>;
}

const useAuthStore = create<AuthStore>((set, get) => ({
  authState: 'Loading',
  user: null,
  isMasterAccount: false,
  setAuthState: (state: AuthState) => set({ authState: state }),
  setUser: (user: User | null) => set({ user }),
  setIsMasterAccount: (isMaster: boolean) => set({ isMasterAccount: isMaster }),
  checkMasterAccountStatus: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Error checking master account status:', error);
        set({ isMasterAccount: false });
        return false;
      }
      
      const isMaster = data?.role === 'master';
      set({ isMasterAccount: isMaster });
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
    setAuthState, 
    setUser,
    setIsMasterAccount,
    checkMasterAccountStatus 
  } = useAuthStore();
  
  return { 
    authState, 
    user, 
    isMasterAccount,
    setAuthState, 
    setUser,
    setIsMasterAccount,
    checkMasterAccountStatus 
  };
} 