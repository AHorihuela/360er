import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();
  const { setUser, setAuthState, checkMasterAccountStatus } = useAuth();

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth error:', error);
          setIsAuthenticated(false);
          setAuthState('Unauthenticated');
          return;
        }

        console.log('Session check:', session ? 'Authenticated' : 'Not authenticated');
        setIsAuthenticated(!!session);
        
        if (session?.user) {
          setUser(session.user);
          setAuthState('Authenticated');
          
          // Check if user is a master account
          await checkMasterAccountStatus(session.user.id);
        } else {
          setAuthState('Unauthenticated');
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          console.log('Auth state changed:', _event, session ? 'Authenticated' : 'Not authenticated');
          setIsAuthenticated(!!session);
          
          if (session?.user) {
            setUser(session.user);
            setAuthState('Authenticated');
            
            // Check if user is a master account
            await checkMasterAccountStatus(session.user.id);
          } else {
            setUser(null);
            setAuthState('Unauthenticated');
          }
        });

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        setAuthState('Unauthenticated');
      }
    }

    checkAuth();
  }, [setUser, setAuthState, checkMasterAccountStatus]);

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