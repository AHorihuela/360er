import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a custom storage object that checks for window availability
const customStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined') {
        return window.localStorage.getItem(key);
      }
      return null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Silently fail if storage is not available
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Silently fail if storage is not available
    }
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: customStorage
  }
});

// Listen for auth state changes without logging sensitive data
supabase.auth.onAuthStateChange((event, _session) => {
  try {
    // Only log in development and not in content script context
    const isContentScript = typeof window !== 'undefined' && 
      'chrome' in window && 
      'runtime' in (window as any).chrome;
      
    if (process.env.NODE_ENV === 'development' && !isContentScript) {
      console.log('Auth state changed:', event);
    }
  } catch {
    // Silently ignore logging in content script context
  }
});

// Export a function to check auth status
export async function checkAuthStatus() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (process.env.NODE_ENV === 'development') {
    console.log('Auth status:', { session, error });
    if (session) {
      const { data, error: userError } = await supabase.from('review_cycles').select('*');
      console.log('Test query result:', { data, error: userError });
    }
  }
  return { session, error };
}

// Set session ID in storage
export function setSessionId(sessionId: string) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('feedback_session_id', sessionId);
    }
  } catch {
    // Silently fail if storage is not available
  }
} 