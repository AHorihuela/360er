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
        console.log('Search params:', Object.fromEntries(searchParams.entries()));

        // Check for error parameters
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        if (error) {
          console.error('Error in URL:', { error, description: errorDescription });
          throw new Error(errorDescription || error);
        }

        // Check for recovery token
        const token = searchParams.get('token');
        if (token) {
          console.log('Recovery token found, verifying...');
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery'
          });

          if (verifyError) {
            console.error('Token verification error:', verifyError);
            throw verifyError;
          }

          console.log('Token verified, redirecting to password update');
          navigate('/update-password');
          return;
        }

        // Handle other auth flows
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }

        if (!session) {
          console.error('No session available');
          throw new Error('No session available');
        }

        console.log('Standard auth flow, redirecting to dashboard');
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