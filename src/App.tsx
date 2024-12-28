import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeesPage } from './pages/employees/EmployeesPage';
import { ReviewCyclesPage } from './pages/reviews/ReviewCyclesPage';
import { NewReviewCyclePage } from './pages/reviews/NewReviewCyclePage';
import { ReviewCycleDetailsPage } from './pages/reviews/ReviewCycleDetailsPage';
import { EmployeeReviewDetailsPage } from './pages/reviews/EmployeeReviewDetailsPage';
import { FeedbackFormPage } from './pages/feedback/FeedbackFormPage';
import { ThankYouPage } from './pages/feedback/ThankYouPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/toaster';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { getVersion } from './lib/version';
import { Trophy, Target, LineChart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

function HomePage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard');
      }
      setIsLoading(false);
    });
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col dark:bg-gray-950">
      {/* Navigation */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:bg-gray-950/80">
        <div className="container mx-auto flex h-14 items-center justify-between">
          <span className="text-xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Squad360
          </span>
          <Button 
            onClick={() => navigate('/login')} 
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1">
        <div className="container mx-auto grid min-h-[calc(100vh-3.5rem)] lg:grid-cols-2 items-center gap-8 py-8">
          <div className="space-y-6">
            <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent leading-[1.2] pb-1">
              Transform peer feedback into actionable insights
            </h1>
            <p className="text-xl text-muted-foreground dark:text-gray-400">
              Harness the power of AI to collect, analyze, and deliver meaningful feedback that drives professional growth.
            </p>
            <div className="flex gap-4">
              <Button 
                size="lg" 
                onClick={() => navigate('/login')}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white transition-all duration-300"
              >
                Get Started
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="border-primary text-primary hover:bg-primary/10 transition-all duration-300"
              >
                Learn More
              </Button>
            </div>
          </div>
          <div className="hidden lg:block relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 rounded-lg dark:from-primary/10 dark:via-secondary/10 dark:to-accent/10" />
            <div className="aspect-square rounded-lg bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/10 shadow-xl dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t bg-muted/50 dark:bg-gray-900">
        <div className="container mx-auto py-24 space-y-16">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-12">
            Built for High-Performance Teams
          </h2>
          <div className="grid gap-12 md:grid-cols-3">
            {/* AI-Enhanced Reviews */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-primary/10">
                  <LineChart className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-primary">Game-Changing AI Analysis</h3>
              </div>
              <p className="text-muted-foreground">
                Get AI-powered insights on your performance across key competencies, just like pro sports analytics.
              </p>
            </div>

            {/* Team-First Feedback */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-secondary/10">
                  <Trophy className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold text-secondary">Squad-First Feedback</h3>
              </div>
              <p className="text-muted-foreground">
                Foster honest communication through anonymous feedback from your squad members, building trust like championship teams.
              </p>
            </div>

            {/* Growth Tracking */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-accent/10">
                  <Target className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-accent">Performance Tracking</h3>
              </div>
              <p className="text-muted-foreground">
                Track your progress like an athlete, measuring growth across review cycles to reach your peak potential.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 md:px-8 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © 2024 Squad360. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">v{getVersion()}</p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [session, setSession] = useState<any>(null);
  const { setAuthState, setUser } = useAuth();

  useEffect(() => {
    // Initialize auth state
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error checking auth state:', error);
      }
      setSession(session);
      setAuthState(session ? 'Authenticated' : 'Unauthenticated');
      setUser(session?.user ?? null);
      setIsInitialized(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setAuthState(session ? 'Authenticated' : 'Unauthenticated');
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setAuthState, setUser]);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse space-y-4 text-center">
          <div className="text-2xl font-semibold">360° Feedback</div>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/feedback/thank-you" element={<ThankYouPage />} />
          <Route path="/feedback/:uniqueLink" element={<FeedbackFormPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DashboardPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <EmployeesPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviews"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ReviewCyclesPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviews/new-cycle"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <NewReviewCyclePage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviews/:cycleId"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ReviewCycleDetailsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviews/:cycleId/employee/:employeeId"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <EmployeeReviewDetailsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to={session ? '/dashboard' : '/'} replace />} />
        </Routes>
      </Router>
      <Toaster />
    </>
  );
}

export default App;
