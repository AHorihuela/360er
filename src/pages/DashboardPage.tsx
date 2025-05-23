import { useDashboardData } from '@/hooks/useDashboardData';
import { OnboardingSection } from '@/components/dashboard/OnboardingSection';
import { ReviewCycleSelector } from '@/components/dashboard/ReviewCycleSelector';
import { ActiveReviewCycleCard } from '@/components/dashboard/ActiveReviewCycleCard';
import { CurrentCycleEmployees } from '@/components/dashboard/CurrentCycleEmployees';
import { OtherEmployees } from '@/components/dashboard/OtherEmployees';
import { AnalyticsSection } from '@/components/dashboard/AnalyticsSection';

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
    handleCycleChange,
    handleAddEmployeeToCycle
  } = useDashboardData();

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
        />
      </div>
    </div>
  );
} 