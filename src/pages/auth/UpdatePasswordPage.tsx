import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { MainLayout } from '@/components/layout/MainLayout';

export default function UpdatePasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if we have the recovery state
    console.log('Update password page mounted', {
      hasState: !!location.state,
      isRecoveryMode: location.state?.recoveryMode
    });
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    console.log('Password update initiated');

    try {
      // Check if we have recovery tokens
      const recoveryMode = location.state?.recoveryMode;
      const accessToken = location.state?.accessToken;
      
      console.log('Update context:', { 
        recoveryMode,
        hasAccessToken: !!accessToken
      });

      // Update the password directly
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Password update failed:', error);
        throw error;
      }

      console.log('Password updated successfully');
      toast({
        title: 'Password updated successfully',
        description: 'You can now log in with your new password.',
      });

      // Clear the session and redirect to login
      console.log('Signing out user');
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error: any) {
      console.error('Password update error:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        details: error.details || 'No additional details'
      });
      toast({
        title: 'Error updating password',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <div className="w-full max-w-md space-y-6 bg-background/95 backdrop-blur-sm p-8 rounded-lg border shadow-lg">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight">Update Your Password</h1>
            <p className="text-muted-foreground">Enter your new password below</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
} 