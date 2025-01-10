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
  const [isTokenValid, setIsTokenValid] = useState(false);

  useEffect(() => {
    // Check if we have a valid recovery token
    const hashParams = new URLSearchParams(location.hash.replace('#', ''));
    const accessToken = hashParams.get('access_token');
    
    if (accessToken) {
      setIsTokenValid(true);
      // Set the access token for the password update
      supabase.auth.setSession({ access_token: accessToken, refresh_token: '' });
    } else {
      toast({
        title: 'Invalid recovery link',
        description: 'Please request a new password reset link.',
        variant: 'destructive',
      });
      navigate('/login');
    }
  }, [navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      toast({
        title: 'Password updated successfully',
        description: 'You can now log in with your new password.',
      });

      // Clear the session after password update
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error: any) {
      toast({
        title: 'Error updating password',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isTokenValid) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-semibold">Invalid Recovery Link</div>
            <div className="text-muted-foreground">Please request a new password reset link</div>
          </div>
        </div>
      </MainLayout>
    );
  }

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