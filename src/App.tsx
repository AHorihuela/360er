import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import LoginPage from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
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
import { Trophy, Target, LineChart, CheckCircle2, Users, Briefcase } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { FeedbackViz } from '@/components/FeedbackViz';
import { AccountPage } from '@/pages/account/AccountPage';
import AuthCallbackPage from '@/pages/auth/AuthCallbackPage';
import UpdatePasswordPage from '@/pages/auth/UpdatePasswordPage';
import AnalyticsPage from '@/pages/analytics';
import { MethodologyExplanation } from '@/components/methodology/MethodologyExplanation';
import { Badge } from '@/components/ui/badge';
import { Analytics } from '@vercel/analytics/react';

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
        <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent logo-font tracking-tight">
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
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5" />
        
        {/* Background animation with reduced opacity on mobile */}
        <div className="absolute inset-0 opacity-[0.03] sm:opacity-30">
          <FeedbackViz />
        </div>

        {/* Additional gradient overlay for mobile */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background/90 sm:hidden" />
        
        {/* Content */}
        <div className="container max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-8 py-8 relative px-4 sm:px-6 lg:px-8">
          {/* Left column - Content */}
          <div className="flex-1 space-y-6 sm:space-y-8 pt-8 sm:pt-12 lg:pt-24 w-full">
            <div className="inline-flex items-center rounded-full border px-3 sm:px-6 py-2 text-sm font-medium bg-background/95 backdrop-blur-sm hover:bg-background/90 transition-colors cursor-pointer max-w-full overflow-hidden">
              <span className="relative flex h-2.5 w-2.5 mr-2 sm:mr-3 flex-shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary"></span>
              </span>
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-[length:200%_100%] bg-clip-text text-transparent animate-gradient whitespace-nowrap text-xs sm:text-sm truncate">
                Advanced AI Analytics with Confidence Scoring
              </span>
            </div>
            <div className="space-y-4 sm:space-y-6">
              <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] pb-1 break-words">
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Transform feedback into actionable insights
                </span>
              </h1>
              <p className="text-base sm:text-xl text-muted-foreground dark:text-gray-400 leading-relaxed">
                Collect and analyze 360° feedback and manager effectiveness surveys with confidence-rated insights, competency scoring, and detailed growth recommendations.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
              <Button 
                size="lg" 
                onClick={() => navigate('/signup')}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white transition-all duration-300 h-11 sm:h-12 px-4 sm:px-8 w-full sm:w-auto text-sm sm:text-base"
              >
                Get Started for Free
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="border-primary text-primary hover:bg-primary/10 transition-all duration-300 bg-background/80 backdrop-blur-sm h-11 sm:h-12 px-4 sm:px-8 w-full sm:w-auto text-sm sm:text-base"
              >
                See How It Works
              </Button>
            </div>
            <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground pt-4 overflow-x-auto pb-2">
              <div className="flex items-center gap-1.5 sm:gap-2 hover:text-primary transition-colors whitespace-nowrap">
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                AI-Powered Insights
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 hover:text-primary transition-colors whitespace-nowrap">
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                Track Your Progress
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 hover:text-primary transition-colors whitespace-nowrap">
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                Complete Feedback System
              </div>
            </div>
          </div>

          {/* Right column - Empty space for animation to show through */}
          <div className="hidden lg:block flex-1 h-[600px]" />
        </div>
      </section>

      {/* Survey Types Section - NEW */}
      <section className="border-t bg-background">
        <div className="container mx-auto py-16">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Two Powerful Feedback Solutions</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the right feedback approach for your team's needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 360° Feedback Card */}
            <div className="group relative rounded-xl border bg-gradient-to-b from-background to-muted/50 p-6 hover:shadow-lg transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">360° Feedback</h3>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Comprehensive
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Collect holistic feedback from peers, managers, and direct reports to identify strengths and growth opportunities across key competencies.
                </p>
                <div className="pt-2">
                  <h4 className="text-sm font-medium mb-2">Ideal for:</h4>
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      Individual development planning
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      Performance reviews
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      Identifying high-potential talent
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Manager Effectiveness Card */}
            <div className="group relative rounded-xl border bg-gradient-to-b from-background to-muted/50 p-6 hover:shadow-lg transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <Briefcase className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">Manager Effectiveness</h3>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Leadership
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Evaluate leadership effectiveness with structured feedback on communication, team development, strategic direction, and execution capabilities.
                </p>
                <div className="pt-2">
                  <h4 className="text-sm font-medium mb-2">Ideal for:</h4>
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      Leadership development
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      Team satisfaction assessment
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      Improving management practices
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-10">
            <Button
              variant="outline"
              onClick={() => navigate('/methodology')}
              className="border-primary text-primary hover:bg-primary/10"
            >
              Learn More About Our Methodology
            </Button>
          </div>
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
            <div className="hidden md:block absolute top-[45px] left-[10%] right-[10%] h-1 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20">
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent opacity-20 animate-pulse" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-6 relative">
              {/* Step 1 */}
              <div className="relative group">
                <div className="absolute -inset-4 rounded-lg bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative space-y-6">
                  <div className="relative flex justify-center">
                    <div className="w-24 h-24 rounded-full bg-background flex items-center justify-center relative">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20" />
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 flex items-center justify-center text-2xl font-bold text-primary relative group-hover:scale-110 transition-transform">
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
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20" />
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 flex items-center justify-center text-2xl font-bold text-primary relative group-hover:scale-110 transition-transform">
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
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20" />
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 flex items-center justify-center text-2xl font-bold text-primary relative group-hover:scale-110 transition-transform">
                        3
                      </div>
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold">Gather Feedback</h3>
                    <p className="text-muted-foreground">
                      Share anonymous feedback links for 360° reviews or manager effectiveness surveys
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
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20" />
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 flex items-center justify-center text-2xl font-bold text-primary relative group-hover:scale-110 transition-transform">
                        4
                      </div>
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold">Get Detailed Insights</h3>
                    <p className="text-muted-foreground">
                      Receive confidence-rated analysis, competency scoring, and actionable growth recommendations
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
              onClick={() => navigate('/signup')}
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
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Built for Data-Driven Growth</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive analysis for both 360° feedback and manager effectiveness surveys
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
                    onClick={() => navigate('/signup')}
                    className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white transition-all duration-300"
                  >
                    Get Started for Free
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    onClick={() => navigate('/login')}
                    className="border-primary text-primary hover:bg-primary/10 transition-all duration-300"
                  >
                    Login
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
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            }
          />
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
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <AnalyticsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/methodology" element={<MainLayout><MethodologyExplanation /></MainLayout>} />
          <Route path="*" element={<Navigate to={session ? '/dashboard' : '/'} replace />} />
        </Routes>
      </Router>
      <Analytics />
      <Toaster />
    </>
  );
}

export default App;
