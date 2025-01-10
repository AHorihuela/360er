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
        
        // Get both search params and hash params
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // Combine params, with hash taking precedence
        const allParams = new Map([
          ...Array.from(urlParams.entries()),
          ...Array.from(hashParams.entries())
        ]);
        
        console.log('All params:', Object.fromEntries(allParams));

        // Check for error parameters
        const error = allParams.get('error');
        const errorDescription = allParams.get('error_description');
        if (error) {
          console.error('Error in params:', { error, description: errorDescription });
          throw new Error(errorDescription || error);
        }

        // Check for recovery token in both query and hash
        const token = urlParams.get('token') || hashParams.get('token');
        const type = urlParams.get('type') || hashParams.get('type');
        
        if (token && type === 'recovery') {
          console.log('Recovery flow detected');
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
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

        // Handle other auth flows
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