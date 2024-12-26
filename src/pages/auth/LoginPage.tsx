import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

export function LoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [view, setView] = useState<'signIn' | 'signUp' | 'forgotPassword'>('signIn');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let response;

      if (view === 'signIn') {
        response = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
      } else if (view === 'signUp') {
        response = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });
      } else {
        response = await supabase.auth.resetPasswordForEmail(formData.email);
        toast({
          title: "Check your email",
          description: "We've sent you a password reset link.",
        });
      }

      if (response.error) throw response.error;
      
      if (view === 'signUp') {
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center blur-sm scale-110" 
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&q=80")' }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/30 to-black/20" />
      <div className="w-full max-w-md p-8 space-y-6 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl relative">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Welcome back to FuboLens
          </h1>
          <p className="text-muted-foreground">
            {view === 'signIn' ? 'Sign in to your account' : 
             view === 'signUp' ? 'Create your account' : 
             'Reset your password'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email address</label>
            <Input 
              type="email" 
              placeholder="name@fubo.tv"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required 
            />
          </div>
          
          {view !== 'forgotPassword' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input 
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>
          )}

          <Button 
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary-dark hover:to-secondary-dark transition-all duration-300"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 
             view === 'signIn' ? 'Sign in' : 
             view === 'signUp' ? 'Create account' : 
             'Reset password'}
          </Button>

          <div className="space-y-2 text-center">
            {view === 'signIn' ? (
              <>
                <button 
                  type="button"
                  onClick={() => setView('forgotPassword')}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot your password?
                </button>
                <div className="text-sm text-muted-foreground">
                  New to FuboLens?{' '}
                  <button 
                    type="button"
                    onClick={() => setView('signUp')}
                    className="text-primary hover:underline"
                  >
                    Create an account
                  </button>
                </div>
              </>
            ) : view === 'signUp' ? (
              <div className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <button 
                  type="button"
                  onClick={() => setView('signIn')}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Remember your password?{' '}
                <button 
                  type="button"
                  onClick={() => setView('signIn')}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
} 