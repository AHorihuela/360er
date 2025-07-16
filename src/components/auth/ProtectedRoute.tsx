import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const { authState, user, isMasterAccount, checkMasterAccountStatus } = useAuth();
  const [isMasterStatusChecked, setIsMasterStatusChecked] = useState(false);

  // Only check master account status when we have a user and auth is confirmed
  useEffect(() => {
    if (authState === 'Authenticated' && user?.id) {
      checkMasterAccountStatus(user.id)
        .catch((error) => {
          console.error('Error checking master account status in ProtectedRoute:', error);
        })
        .finally(() => {
          setIsMasterStatusChecked(true);
        });
    } else {
      // For users without ID, null users, or unauthenticated users, don't mark as checked
      setIsMasterStatusChecked(false);
    }
  }, [authState, user?.id, checkMasterAccountStatus]);

  // Still loading auth state or master account status
  if (authState === 'Loading' || (authState === 'Authenticated' && !isMasterStatusChecked)) {
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