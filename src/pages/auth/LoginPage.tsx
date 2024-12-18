import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function LoginPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<'sign_in' | 'sign_up'>('sign_in');

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-8 shadow-sm">
        <div className="text-center">
          <h2 className="text-2xl font-bold">
            {view === 'sign_in' ? 'Sign in to your account' : 'Create your account'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {view === 'sign_in' 
              ? 'Welcome back to 360° Feedback'
              : 'Start managing your team feedback today'}
          </p>
        </div>
        
        <Auth
          supabaseClient={supabase}
          appearance={{ 
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'rgb(var(--primary))',
                  brandAccent: 'rgb(var(--primary))',
                }
              }
            }
          }}
          providers={[]}
          redirectTo={`${window.location.origin}/dashboard`}
          view={view}
          showLinks={false}
        />

        <div className="text-center">
          <Button
            variant="link"
            onClick={() => setView(view === 'sign_in' ? 'sign_up' : 'sign_in')}
          >
            {view === 'sign_in' 
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </Button>
        </div>
      </div>
    </div>
  );
} 