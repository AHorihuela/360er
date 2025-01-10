import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { toast } from '@/components/ui/use-toast';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        
        console.log('Auth callback initiated:', { hasCode: !!code });
        console.log('Full URL:', window.location.href);
        console.log('Search params:', Object.fromEntries(searchParams.entries()));

        if (!code) {
          console.error('No code found in URL');
          throw new Error('No code found in URL');
        }

        // Exchange the code for a session
        console.log('Exchanging code for session');
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error('Code exchange error:', error);
          throw error;
        }

        if (!data.session) {
          console.error('No session available after code exchange');
          throw new Error('No session available after code exchange');
        }

        // Check if this is a recovery flow by looking at the session
        const isRecoveryFlow = data.session.user?.aud === 'recovery';
        console.log('Session established', { isRecoveryFlow });

        if (isRecoveryFlow) {
          console.log('Recovery flow detected, redirecting to password update');
          navigate('/update-password', { 
            state: { 
              recoveryMode: true,
              accessToken: data.session.access_token,
              refreshToken: data.session.refresh_token
            }
          });
          return;
        }

        // For other auth flows (signup, etc)
        console.log('Standard auth flow, checking session');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session) {
          console.log('Session found, redirecting to dashboard');
          navigate('/dashboard');
        } else {
          console.log('No session found, redirecting to login');
          navigate('/login');
        }
      } catch (error: any) {
        console.error('Auth error:', error);
        console.error('Full error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
          details: error.details || 'No additional details'
        });
        toast({
          title: 'Error',
          description: error.message || 'An error occurred during authentication',
          variant: 'destructive',
        });
        navigate('/login');
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <MainLayout>
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <div className="animate-pulse space-y-4 text-center">
          <div className="text-2xl font-semibold">360° Feedback</div>
          <div className="text-muted-foreground">Verifying...</div>
        </div>
      </div>
    </MainLayout>
  );
} 