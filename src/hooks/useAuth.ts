import { create } from 'zustand';
import { User } from '@supabase/supabase-js';

type AuthState = 'Loading' | 'Authenticated' | 'Unauthenticated';

interface AuthStore {
  authState: AuthState;
  user: User | null;
  setAuthState: (state: AuthState) => void;
  setUser: (user: User | null) => void;
}

const useAuthStore = create<AuthStore>((set) => ({
  authState: 'Loading',
  user: null,
  setAuthState: (state: AuthState) => set({ authState: state }),
  setUser: (user: User | null) => set({ user }),
}));

export function useAuth() {
  const { authState, user, setAuthState, setUser } = useAuthStore();
  return { authState, user, setAuthState, setUser };
} 