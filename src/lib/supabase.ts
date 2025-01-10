import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined
  }
});

// Listen for auth state changes without logging sensitive data
supabase.auth.onAuthStateChange((event, _session) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Auth state changed:', event);
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
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem('feedback_session_id', sessionId);
  }
} 