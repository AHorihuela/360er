import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth error:', error);
          setIsAuthenticated(false);
          return;
        }

        console.log('Session check:', session ? 'Authenticated' : 'Not authenticated');
        setIsAuthenticated(!!session);

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          console.log('Auth state changed:', _event, session ? 'Authenticated' : 'Not authenticated');
          setIsAuthenticated(!!session);
        });

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      }
    }

    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Store the attempted URL
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
} 