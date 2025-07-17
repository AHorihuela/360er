import { useDashboardData } from '@/hooks/useDashboardData';
import { OnboardingSection } from '@/components/dashboard/OnboardingSection';
import { ReviewCycleSelector } from '@/components/dashboard/ReviewCycleSelector';
import { QuickFeedbackSection } from '@/components/dashboard/QuickFeedbackSection';
import { ActiveReviewCycleCard } from '@/components/dashboard/ActiveReviewCycleCard';
import { CurrentCycleEmployees } from '@/components/dashboard/CurrentCycleEmployees';
import { OtherEmployees } from '@/components/dashboard/OtherEmployees';
import { AnalyticsSection } from '@/components/dashboard/AnalyticsSection';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Mail } from 'lucide-react';

export function DashboardPage(): JSX.Element {
  const {
    isLoading,
    activeReviewCycle,
    employees,
    employeesData,
    allReviewCycles,
    selectedCycleId,
    surveyQuestions,
    user,
    isMasterAccount,
    viewingAllAccounts,
    currentCycleUserEmail,
    currentCycleUserId,
    handleCycleChange,
    handleAddEmployeeToCycle,
    fetchData
  } = useDashboardData();

  const handleFeedbackSubmitted = () => {
    // Refresh dashboard data after feedback submission
    fetchData?.();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Show onboarding for new users only if they have no employees
  if (!employeesData.length) {
    return <OnboardingSection />;
  }

  // Show regular dashboard for existing users
  return (
    <div className="container mx-auto py-4 px-4 md:px-6">
      <div className="flex flex-col space-y-4 md:space-y-6">
        <ReviewCycleSelector
          selectedCycleId={selectedCycleId}
          allReviewCycles={allReviewCycles}
          activeReviewCycle={activeReviewCycle}
          onCycleChange={handleCycleChange}
          isMasterAccount={isMasterAccount}
          viewingAllAccounts={viewingAllAccounts}
          currentUserId={user?.id || ''}
        />
        
        {/* Master Account Info - Show creator's email when in master mode */}
        {currentCycleUserEmail && activeReviewCycle && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                  Master View
                </Badge>
                <Mail className="h-4 w-4 text-amber-700" />
                <span className="text-amber-800">
                  Review cycle created by: <span className="font-medium">{currentCycleUserEmail}</span>
                </span>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Quick Feedback Entry - Manager-to-Employee only */}
        {activeReviewCycle && (
          <QuickFeedbackSection
            activeReviewCycle={activeReviewCycle}
            employees={employees}
            onFeedbackSubmitted={handleFeedbackSubmitted}
          />
        )}
        
        {/* Active Review Cycle Progress */}
        {activeReviewCycle && (
          <>
            <ActiveReviewCycleCard activeReviewCycle={activeReviewCycle} />

            {/* Analytics Grid */}
            <AnalyticsSection
              activeReviewCycle={activeReviewCycle}
              allReviewCycles={allReviewCycles}
              employees={employees}
              surveyQuestions={surveyQuestions}
            />
          </>
        )}

        {/* Current Cycle Employees */}
        {employees.filter(e => e.total_reviews > 0).length > 0 && activeReviewCycle && (
          <CurrentCycleEmployees 
            employees={employees}
            activeReviewCycleId={activeReviewCycle.id}
          />
        )}

        {/* Other Employees */}
        <OtherEmployees
          employeesData={employeesData}
          activeReviewCycle={activeReviewCycle}
          onAddEmployeeToCycle={handleAddEmployeeToCycle}
          isMasterAccount={isMasterAccount}
          viewingAllAccounts={viewingAllAccounts}
          currentUserId={user?.id}
          activeReviewCycleUserId={currentCycleUserId || undefined}
        />
      </div>
    </div>
  );
} 