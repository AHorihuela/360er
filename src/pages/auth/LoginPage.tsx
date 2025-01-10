import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { FeedbackViz } from '@/components/FeedbackViz';

export function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard');
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      {/* Background animation */}
      <div className="absolute inset-0">
        <FeedbackViz />
      </div>

      {/* Content */}
      <div className="container relative mx-auto flex flex-1 items-center justify-center">
        <div className="w-full max-w-md space-y-6 bg-background/95 backdrop-blur-sm p-8 rounded-lg border shadow-lg">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to continue to Squad360</p>
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
                  },
                },
              },
              className: {
                container: 'space-y-4',
                button: '!bg-gradient-to-r !from-primary !to-secondary hover:!opacity-90 !transition-all !duration-300 !outline-none !ring-0 focus-visible:!ring-0',
                anchor: 'text-primary hover:text-primary/90',
                label: 'text-foreground/90 font-medium',
                input: 'bg-background border-input',
                divider: 'bg-border',
                message: 'text-foreground/70',
              },
            }}
            providers={[]}
            redirectTo={`${window.location.origin}/auth/callback`}
          />
        </div>
      </div>
    </div>
  );
} 