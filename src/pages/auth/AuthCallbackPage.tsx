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
        // Initial state logging
        console.log('=== Auth Callback Flow Started ===');
        console.log('Full URL:', window.location.href);
        console.log('Search params:', window.location.search);
        console.log('Hash:', window.location.hash);
        console.log('Raw search params:', Object.fromEntries(searchParams.entries()));
        
        // Session check
        console.log('Checking for existing session...');
        const { data: { session: existingSession }, error: sessionCheckError } = await supabase.auth.getSession();
        
        if (sessionCheckError) {
          console.error('Error checking session:', sessionCheckError);
        }
        
        if (existingSession) {
          console.log('Existing session found:', {
            user: existingSession.user.email,
            expiresAt: existingSession.expires_at
          });
          console.log('Signing out for potential password reset...');
          await supabase.auth.signOut();
          console.log('Sign out completed');
        } else {
          console.log('No existing session found');
        }

        // URL parameter parsing
        console.log('Parsing URL parameters...');
        const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
        const urlParams = new URLSearchParams(window.location.search);
        
        console.log('URL Parameters:', {
          fromSearch: Object.fromEntries(urlParams.entries()),
          fromHash: Object.fromEntries(hashParams.entries())
        });
        
        // Token extraction
        const token = urlParams.get('token') || hashParams.get('token') || hashParams.get('access_token');
        const type = urlParams.get('type') || hashParams.get('type');
        const recoveryFlow = type === 'recovery' || window.location.hash.includes('type=recovery');
        
        console.log('Extracted auth parameters:', {
          token: token ? 'Present' : 'Not found',
          type,
          recoveryFlow,
          hasRecoveryInHash: window.location.hash.includes('type=recovery')
        });

        // Error checking
        const error = urlParams.get('error') || hashParams.get('error');
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
        
        if (error) {
          console.log('Error parameters found:', { error, description: errorDescription });
          if (error === 'access_denied' && errorDescription?.includes('Email link is invalid or has expired')) {
            console.log('Handling expired OTP case');
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

        // Recovery flow handling
        if (recoveryFlow) {
          console.log('Starting recovery flow verification...');
          if (!token) {
            console.error('Recovery flow detected but no token found');
            throw new Error('Invalid recovery link - no token present');
          }

          console.log('Verifying OTP for recovery...');
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery'
          });

          if (verifyError) {
            console.error('Recovery verification failed:', verifyError);
            throw verifyError;
          }

          console.log('Recovery verification successful, proceeding to password update');
          navigate('/update-password');
          return;
        }

        // Final session check
        console.log('Performing final session verification...');
        const { data: { session }, error: finalSessionError } = await supabase.auth.getSession();
        
        if (finalSessionError) {
          console.error('Final session check failed:', finalSessionError);
          throw finalSessionError;
        }

        if (!session) {
          console.log('No valid session after flow completion, redirecting to login');
          navigate('/login');
          return;
        }

        console.log('Auth flow completed successfully with valid session');
        console.log('User:', session.user.email);
        console.log('Redirecting to dashboard');
        navigate('/dashboard');
      } catch (error: any) {
        console.error('=== Auth Flow Error ===');
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
          details: error.details || 'No additional details'
        });
        console.error('Current URL state:', {
          href: window.location.href,
          search: window.location.search,
          hash: window.location.hash
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