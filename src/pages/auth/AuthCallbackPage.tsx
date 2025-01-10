import { useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { toast } from '@/components/ui/use-toast';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  useEffect(() => {
    const handleRecovery = async () => {
      try {
        // Get the token from the URL
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        if (type === 'recovery' && token) {
          // Exchange the recovery token for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(token);

          if (error) throw error;

          // If exchange successful, redirect to update password with the access token
          if (data?.session?.access_token) {
            navigate('/update-password#access_token=' + data.session.access_token);
            return;
          }
        }

        // For other auth flows, check session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate('/dashboard');
        } else {
          navigate('/login');
        }
      } catch (error: any) {
        console.error('Auth error:', error);
        toast({
          title: 'Error',
          description: error.message || 'An error occurred during authentication',
          variant: 'destructive',
        });
        navigate('/login');
      }
    };

    handleRecovery();
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