import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Clock,
  PlusCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { FeedbackInputForm } from '@/components/manager-feedback/FeedbackInputForm';
import { FeedbackList } from '@/components/manager-feedback/FeedbackList';
import { ReviewCycleSelector } from '@/components/dashboard/ReviewCycleSelector';
import { Employee } from '@/types/review';
import { useNavigate } from 'react-router-dom';

export default function ManagerFeedbackDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    employees,
    allReviewCycles,
    selectedCycleId,
    activeReviewCycle,
    handleCycleChange,
    isMasterAccount,
    viewingAllAccounts,
    isLoading
  } = useDashboardData();

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filter for manager-to-employee cycles only
  const managerFeedbackCycles = allReviewCycles.filter(cycle => 
    cycle.type === 'manager_to_employee'
  );

  const currentManagerCycle = managerFeedbackCycles.find(cycle => 
    cycle.id === selectedCycleId
  );

  // Get employees from the current M2E cycle
  const cycleEmployees: Employee[] = currentManagerCycle?.feedback_requests?.map(request => {
    const employee = employees.find(emp => emp.id === request.employee_id);
    return employee;
  }).filter(Boolean) as Employee[] || [];

  const handleFeedbackUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCreateCycle = () => {
    navigate('/reviews/new-cycle?type=manager_to_employee');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2 animate-spin" />
            <p className="text-muted-foreground">Loading manager feedback dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no manager feedback cycles exist
  if (managerFeedbackCycles.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Manager Feedback System</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create your first Manager-to-Employee feedback cycle to start providing 
            continuous feedback for your team members.
          </p>
          <Button onClick={handleCreateCycle} className="bg-purple-600 hover:bg-purple-700">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Manager Feedback Cycle
          </Button>
        </div>
      </div>
    );
  }

  // Show message if no current M2E cycle is selected
  if (!currentManagerCycle) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Manager Feedback</h1>
            <p className="text-muted-foreground">
              Provide continuous feedback for your team members
            </p>
          </div>
          <Button onClick={handleCreateCycle} variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Cycle
          </Button>
        </div>

        <ReviewCycleSelector
          selectedCycleId={selectedCycleId}
          allReviewCycles={managerFeedbackCycles}
          activeReviewCycle={activeReviewCycle}
          onCycleChange={handleCycleChange}
          isMasterAccount={isMasterAccount}
          viewingAllAccounts={viewingAllAccounts}
          currentUserId={user?.id || ''}
        />

        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Manager Feedback Cycle</h3>
            <p className="text-muted-foreground">
              Choose a Manager-to-Employee feedback cycle from the dropdown above to start providing feedback.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manager Feedback</h1>
          <p className="text-muted-foreground">
            Provide continuous feedback for your team members
          </p>
        </div>
        <Button onClick={handleCreateCycle} variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" />
          New Cycle
        </Button>
      </div>

      {/* Cycle Selector */}
      <ReviewCycleSelector
        selectedCycleId={selectedCycleId}
        allReviewCycles={managerFeedbackCycles}
        activeReviewCycle={activeReviewCycle}
        onCycleChange={handleCycleChange}
        isMasterAccount={isMasterAccount}
        viewingAllAccounts={viewingAllAccounts}
        currentUserId={user?.id || ''}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cycleEmployees.length}</div>
            <p className="text-xs text-muted-foreground">
              in current cycle
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cycle</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{currentManagerCycle.title}</div>
            <p className="text-xs text-muted-foreground">
              Continuous feedback collection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feedback Type</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">Manager to Employee</div>
            <Badge variant="outline" className="text-xs mt-1 bg-purple-50 text-purple-600 border-purple-200">
              Continuous
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="submit" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="submit" className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Submit Feedback
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Feedback History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="space-y-4">
          <FeedbackInputForm
            reviewCycleId={currentManagerCycle.id}
            employees={cycleEmployees}
            onSubmissionSuccess={handleFeedbackUpdate}
            cycleTitle={currentManagerCycle.title}
          />

          {cycleEmployees.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground mb-4">
                  No team members in this cycle yet.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/reviews/${currentManagerCycle.id}`)}
                >
                  Add Team Members
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <FeedbackList
            reviewCycleId={currentManagerCycle.id}
            employees={cycleEmployees}
            onFeedbackUpdate={handleFeedbackUpdate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 