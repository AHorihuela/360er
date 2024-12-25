import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Content-Type': 'application/json'
    }
  }
});

// Debug logging for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', { event, session });
  if (session) {
    console.log('User ID:', session.user.id);
    console.log('Access Token:', session.access_token);
  }
});

// Export a function to check auth status
export async function checkAuthStatus() {
  const { data: { session }, error } = await supabase.auth.getSession();
  console.log('Auth status:', { session, error });
  if (session) {
    const { data, error: userError } = await supabase.from('review_cycles').select('*');
    console.log('Test query result:', { data, error: userError });
  }
  return { session, error };
} 