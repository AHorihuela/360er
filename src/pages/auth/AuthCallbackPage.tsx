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
    // Check URL hash for error parameters
    const hashParams = new URLSearchParams(location.hash.replace('#', ''));
    const error = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');

    if (error) {
      toast({
        title: 'Error',
        description: errorDescription || 'An error occurred during authentication',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    // Check if this is a password recovery flow
    const type = searchParams.get('type') || hashParams.get('type');
    
    if (type === 'recovery') {
      // For password reset flow, redirect to update password page
      navigate('/update-password');
      return;
    }

    // For other auth flows, check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    });
  }, [navigate, searchParams, location]);

  return (
    <MainLayout>
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <div className="animate-pulse space-y-4 text-center">
          <div className="text-2xl font-semibold">360° Feedback</div>
          <div className="text-muted-foreground">Redirecting...</div>
        </div>
      </div>
    </MainLayout>
  );
} 