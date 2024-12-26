import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeesPage } from './pages/employees/EmployeesPage';
import { ReviewCyclesPage } from './pages/reviews/ReviewCyclesPage';
import { NewReviewCyclePage } from './pages/reviews/NewReviewCyclePage';
import { ManageReviewCyclePage } from './pages/reviews/ManageReviewCyclePage';
import { FeedbackFormPage } from './pages/feedback/FeedbackFormPage';
import { ThankYouPage } from './pages/feedback/ThankYouPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/toaster';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { getVersion } from './lib/version';

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
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white transition-all duration-300"
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
          <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Built for Fubo Teams
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4 p-6 rounded-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <h3 className="text-xl font-semibold text-primary dark:text-primary-light">AI-Enhanced Reviews</h3>
              <p className="text-muted-foreground dark:text-gray-400">Get AI-powered insights on your performance across Fubo's core competencies and values.</p>
            </div>
            <div className="space-y-4 p-6 rounded-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <h3 className="text-xl font-semibold text-secondary dark:text-secondary-light">Team-First Feedback</h3>
              <p className="text-muted-foreground dark:text-gray-400">Collect anonymous feedback from your Fubo teammates to foster honest communication and growth.</p>
            </div>
            <div className="space-y-4 p-6 rounded-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <h3 className="text-xl font-semibold text-accent dark:text-accent-light">Growth Tracking</h3>
              <p className="text-muted-foreground dark:text-gray-400">Track your progress across review cycles and align your development with Fubo's objectives.</p>
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
        </div>
      </footer>
    </div>
  );
}

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // Initialize auth state
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error checking auth state:', error);
      }
      console.log('Initial auth state:', session ? 'Authenticated' : 'Not authenticated');
      setSession(session);
      setIsInitialized(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session ? 'Authenticated' : 'Not authenticated');
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

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
            path="/reviews/:cycleId/manage"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ManageReviewCyclePage />
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
