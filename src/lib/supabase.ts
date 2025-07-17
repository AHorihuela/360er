import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Note: This app intentionally creates two Supabase client instances:
// 1. Main client for authenticated user operations (dashboard, user management)
// 2. Anonymous client for public feedback submission (completely isolated auth)
// The "Multiple GoTrueClient instances" warning in console is expected and safe.

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

// Create isolated storage for anonymous client to prevent auth conflicts
const anonymousStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined') {
        // Use different namespace for anonymous client
        return window.localStorage.getItem(`anon_${key}`);
      }
      return null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`anon_${key}`, value);
      }
    } catch {
      // Silently fail if storage is not available
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(`anon_${key}`);
      }
    } catch {
      // Silently fail if storage is not available
    }
  }
};

// Regular client for authenticated operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: customStorage,
    storageKey: 'sb-auth-token' // Explicit storage key for main client
  },
  global: {
    headers: {
      'X-Client-Info': 'authenticated-client'
    }
  }
});

// Anonymous client for feedback submissions with completely isolated auth
// Note: Multiple GoTrueClient instances warning is expected and safe here - 
// we intentionally use separate clients for authenticated vs anonymous operations
export const anonymousClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Don't persist any session
    autoRefreshToken: false, // Don't auto-refresh
    detectSessionInUrl: false, // Don't detect auth from URL
    storage: anonymousStorage, // Use separate storage namespace
    storageKey: 'sb-anon-token' // Different storage key
  },
  global: {
    headers: {
      'X-Client-Info': 'anonymous-client' // Help identify in logs
    }
  }
});

// Listen for auth state changes ONLY on the main client
supabase.auth.onAuthStateChange((event, _session) => {
  try {
    // Only log in development and not in content script context
    const isContentScript = typeof window !== 'undefined' && 
      'chrome' in window && 
      'runtime' in (window as any).chrome;
      
    if (process.env.NODE_ENV === 'development' && !isContentScript) {
      console.log('Main client auth state changed:', event);
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