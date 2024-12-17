import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { EmployeesPage } from './pages/employees/EmployeesPage';
import { ReviewCyclesPage } from './pages/reviews/ReviewCyclesPage';
import { ManageReviewCyclePage } from './pages/reviews/ManageReviewCyclePage';
import { FeedbackFormPage } from './pages/feedback/FeedbackFormPage';
import { ThankYouPage } from './pages/feedback/ThankYouPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/toaster';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

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
    <div className="flex min-h-screen flex-col items-center justify-center space-y-8 p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">360° Feedback</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-lg">
          A comprehensive platform for managing and conducting 360-degree feedback reviews.
          Get valuable insights from peers, direct reports, and managers.
        </p>
      </div>
      <div className="flex gap-4">
        <Button onClick={() => navigate('/login')} size="lg">
          Get Started
        </Button>
        <Button variant="outline" onClick={() => navigate('/about')} size="lg">
          Learn More
        </Button>
      </div>
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
