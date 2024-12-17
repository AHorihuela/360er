import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export function LoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Current session:', session);
      if (session) {
        navigate('/dashboard');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      if (session) {
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleError = (error: Error) => {
    console.error('Auth error:', error);
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-8 shadow-sm">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Sign in to your account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Welcome back to 360° Feedback
          </p>
        </div>
        
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google']}
          redirectTo={`${window.location.origin}/dashboard`}
          showLinks={false}
          view="sign_in"
        />
      </div>
    </div>
  );
} 