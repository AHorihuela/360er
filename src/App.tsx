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
import { Trophy, Target, LineChart, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { FeedbackViz } from '@/components/FeedbackViz';

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
          <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
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
      <section className="flex-1 relative overflow-hidden">
        {/* Original background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5" />
        
        {/* Background animation with reduced opacity */}
        <div className="absolute inset-0 opacity-100">
          <FeedbackViz />
        </div>
        
        {/* Content */}
        <div className="container max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-8 py-8 relative">
          {/* Left column - Content */}
          <div className="flex-1 space-y-8 pt-12 lg:pt-24">
            <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium bg-background/80 backdrop-blur-sm hover:bg-background/90 transition-colors cursor-pointer">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
              </span>
              Now with AI-powered insights
            </div>
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] pb-1">
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">Transform peer feedback into growth</span>
              </h1>
              <p className="text-xl text-muted-foreground dark:text-gray-400 max-w-xl leading-relaxed">
                Collect, analyze, and deliver meaningful 360° feedback that drives professional development using AI-powered insights.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                size="lg" 
                onClick={() => navigate('/login')}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white transition-all duration-300 h-12 px-8"
              >
                Get Started for Free
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="border-primary text-primary hover:bg-primary/10 transition-all duration-300 bg-background/80 backdrop-blur-sm h-12 px-8"
              >
                See How It Works
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-6 sm:gap-8 text-sm text-muted-foreground pt-4">
              <div className="flex items-center gap-2 hover:text-primary transition-colors">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                100% Anonymous
              </div>
              <div className="flex items-center gap-2 hover:text-primary transition-colors">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Free to Use
              </div>
              <div className="flex items-center gap-2 hover:text-primary transition-colors">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                AI-Powered Insights
              </div>
            </div>
          </div>

          {/* Right column - Empty space for animation to show through */}
          <div className="flex-1 h-[600px]" />
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="border-t bg-background">
        <div className="container mx-auto py-24">
          <div className="text-center space-y-4 mb-24">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get started with Squad360 in four simple steps
            </p>
          </div>

          <div className="relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-[45px] left-[10%] right-[10%] h-0.5 bg-primary/10 -z-10" />
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-6 relative">
              {/* Step 1 */}
              <div className="relative group">
                <div className="absolute -inset-4 rounded-lg bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative space-y-6">
                  <div className="relative flex justify-center">
                    <div className="w-24 h-24 rounded-full bg-background flex items-center justify-center relative">
                      <div className="absolute inset-0 rounded-full bg-primary/5" />
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary relative">
                        1
                      </div>
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold">Create Account</h3>
                    <p className="text-muted-foreground">
                      Sign up in seconds with your work email - no credit card required
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative group">
                <div className="absolute -inset-4 rounded-lg bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative space-y-6">
                  <div className="relative flex justify-center">
                    <div className="w-24 h-24 rounded-full bg-background flex items-center justify-center relative">
                      <div className="absolute inset-0 rounded-full bg-primary/5" />
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary relative">
                        2
                      </div>
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold">Add Your Team</h3>
                    <p className="text-muted-foreground">
                      Create review cycles and add team members to collect feedback from
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative group">
                <div className="absolute -inset-4 rounded-lg bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative space-y-6">
                  <div className="relative flex justify-center">
                    <div className="w-24 h-24 rounded-full bg-background flex items-center justify-center relative">
                      <div className="absolute inset-0 rounded-full bg-primary/5" />
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary relative">
                        3
                      </div>
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold">Gather Feedback</h3>
                    <p className="text-muted-foreground">
                      Share anonymous feedback links with peers, reports, and managers
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="relative group">
                <div className="absolute -inset-4 rounded-lg bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative space-y-6">
                  <div className="relative flex justify-center">
                    <div className="w-24 h-24 rounded-full bg-background flex items-center justify-center relative">
                      <div className="absolute inset-0 rounded-full bg-primary/5" />
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary relative">
                        4
                      </div>
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold">Get Insights</h3>
                    <p className="text-muted-foreground">
                      Receive AI-powered analysis and actionable insights from feedback
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA after steps */}
          <div className="text-center mt-16">
            <Button
              size="lg"
              onClick={() => navigate('/login')}
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white transition-all duration-300 h-12 px-8"
            >
              Get Started Now
            </Button>
            <p className="text-muted-foreground mt-4">
              Start collecting feedback in minutes • 100% anonymous
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t bg-background">
        <div className="container mx-auto py-24 space-y-16">
          {/* Main Features */}
          <div className="text-center space-y-4 mb-24">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Built for High-Performance Teams</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get the insights you need to build stronger teams and drive better performance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* AI-Powered Insights */}
            <div className="group relative rounded-xl border bg-gradient-to-b from-background to-muted/50 p-6 hover:shadow-lg transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <LineChart className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">AI-Powered Insights</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Get AI-powered insights on performance across key competencies, identifying patterns and trends in feedback data.
                </p>
              </div>
            </div>

            {/* Actionable Feedback */}
            <div className="group relative rounded-xl border bg-gradient-to-b from-background to-muted/50 p-6 hover:shadow-lg transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">Actionable Feedback</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Transform qualitative feedback into concrete action items and development opportunities.
                </p>
              </div>
            </div>

            {/* Growth Tracking */}
            <div className="group relative rounded-xl border bg-gradient-to-b from-background to-muted/50 p-6 hover:shadow-lg transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">Growth Tracking</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Monitor progress over time with detailed performance metrics and improvement tracking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-background">
        <div className="container mx-auto py-24">
          <div className="relative rounded-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 blur-xl" />
            <div className="relative bg-background/80 backdrop-blur-sm rounded-lg p-8 md:p-12">
              <div className="mx-auto max-w-2xl text-center space-y-8">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Ready to transform your team's feedback?
                </h2>
                <p className="text-lg text-muted-foreground">
                  Join forward-thinking teams using Squad360 to drive professional growth and development.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Button 
                    size="lg" 
                    onClick={() => navigate('/login')}
                    className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white transition-all duration-300"
                  >
                    Get Started for Free
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    onClick={() => window.open('mailto:support@squad360.com')}
                    className="border-primary text-primary hover:bg-primary/10 transition-all duration-300"
                  >
                    Contact Sales
                  </Button>
                </div>
              </div>
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
