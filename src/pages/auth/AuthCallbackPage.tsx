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
        console.log('Auth callback initiated');
        console.log('Full URL:', window.location.href);
        console.log('Search:', window.location.search);
        console.log('Hash:', window.location.hash);
        
        // First try to get the token from the URL fragment
        const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
        const token = hashParams.get('access_token') || searchParams.get('token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type') || searchParams.get('type');
        
        console.log('Parsed params:', { token, refreshToken, type });

        // Check for error parameters in both search and hash
        const error = searchParams.get('error') || hashParams.get('error');
        const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');
        
        if (error) {
          console.error('Error in params:', { error, description: errorDescription });
          // Don't throw immediately for OTP errors
          if (error === 'access_denied' && errorDescription?.includes('Email link is invalid or has expired')) {
            console.log('Handling expired OTP...');
            toast({
              title: 'Link Expired',
              description: 'The password reset link has expired. Please request a new one.',
              variant: 'destructive',
            });
            navigate('/login');
            return;
          }
          throw new Error(errorDescription || error);
        }

        // Handle recovery flow
        if (type === 'recovery' || window.location.hash.includes('type=recovery')) {
          console.log('Recovery flow detected');
          if (!token) {
            console.error('No token found for recovery flow');
            throw new Error('Invalid recovery link');
          }
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery'
          });

          if (verifyError) {
            console.error('Recovery verification error:', verifyError);
            throw verifyError;
          }

          console.log('Recovery verified, redirecting to password update');
          navigate('/update-password');
          return;
        }

        // Handle access token in hash (standard OAuth flow)
        if (token) {
          console.log('Access token found, setting session...');
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Session error:', sessionError);
            throw sessionError;
          }

          if (session) {
            console.log('Session established, redirecting to dashboard');
            navigate('/dashboard');
            return;
          }
        }

        // If we get here without a token or session, check current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }

        if (!session) {
          console.log('No session available, redirecting to login');
          navigate('/login');
          return;
        }

        console.log('Auth successful, redirecting to dashboard');
        navigate('/dashboard');
      } catch (error: any) {
        console.error('Auth error:', error);
        console.error('Full error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
          details: error.details || 'No additional details'
        });
        
        toast({
          title: 'Authentication Error',
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