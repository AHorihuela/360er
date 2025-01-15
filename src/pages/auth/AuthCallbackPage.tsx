import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { toast } from '@/components/ui/use-toast';

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('=== Auth Callback Flow Started ===');
        console.log('Full URL:', window.location.href);

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth error:', error);
          toast({
            title: 'Authentication Error',
            description: error.message,
            variant: 'destructive',
          });
          navigate('/login');
          return;
        }

        if (session) {
          console.log('Session established:', session.user.email);
          navigate('/dashboard');
        } else {
          console.log('No session found');
          navigate('/login');
        }
      } catch (error: any) {
        console.error('Callback error:', error);
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        navigate('/login');
      }
    };

    handleCallback();
  }, [navigate]);

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