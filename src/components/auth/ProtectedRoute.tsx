import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const { authState, user, checkMasterAccountStatus } = useAuth();

  // Only check master account status when we have a user and auth is confirmed
  useEffect(() => {
    if (authState === 'Authenticated' && user?.id) {
      checkMasterAccountStatus(user.id);
    }
  }, [authState, user?.id, checkMasterAccountStatus]);

  // Still loading auth state
  if (authState === 'Loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Not authenticated
  if (authState === 'Unauthenticated') {
    // Store the attempted URL
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
} 