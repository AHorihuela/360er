import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type CompetencyFilters, type RelationshipType as AnalyticsRelationshipType } from "@/types/analytics";
import { CompetencyAnalysis } from "@/components/competency/CompetencyAnalysis";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { type ReviewCycle } from "@/types/review";
import { type DashboardFeedbackRequest } from "@/types/feedback/dashboard";
import { type RelationshipType as BaseRelationshipType } from "@/types/feedback/base";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { ManagerSurveyAnalytics } from "@/components/analytics/ManagerSurveyAnalytics";
import { ReviewCycleType } from "@/types/survey";
import { Badge } from "@/components/ui/badge";

// Map between base relationship types and analytics relationship types
const RELATIONSHIP_MAPPING: Record<BaseRelationshipType, AnalyticsRelationshipType> = {
  'senior_colleague': 'senior',
  'equal_colleague': 'peer',
  'junior_colleague': 'junior'
};

const RELATIONSHIP_OPTIONS = [
  { value: "senior_colleague" as BaseRelationshipType, label: "Senior Colleagues", analyticsValue: "senior" as AnalyticsRelationshipType },
  { value: "equal_colleague" as BaseRelationshipType, label: "Peer Colleagues", analyticsValue: "peer" as AnalyticsRelationshipType },
  { value: "junior_colleague" as BaseRelationshipType, label: "Junior Colleagues", analyticsValue: "junior" as AnalyticsRelationshipType },
] as const;

export default function AnalyticsPage() {
  const { authState, user, isMasterAccount } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [allReviewCycles, setAllReviewCycles] = useState<ReviewCycle[]>([]);
  const [activeReviewCycle, setActiveReviewCycle] = useState<ReviewCycle | null>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(() => {
    // Initialize from localStorage if available, just like the dashboard
    return localStorage.getItem('selectedCycleId');
  });
  const [filters, setFilters] = useState<CompetencyFilters>({
    employeeIds: [],
    relationships: []
  });
  const [selectedRelationships, setSelectedRelationships] = useState<BaseRelationshipType[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [surveyQuestions, setSurveyQuestions] = useState<Record<string, string>>({});
  const [minReviewCount, setMinReviewCount] = useState<number>(1);
  const [viewingAllAccounts, setViewingAllAccounts] = useState<boolean>(() => {
    const savedState = localStorage.getItem('masterViewingAllAccounts');
    return savedState === 'true';
  });

  useEffect(() => {
    if (authState !== "Authenticated") {
      navigate("/login");
    }
  }, [authState, navigate]);

  // Sync viewingAllAccounts with the global auth state
  useEffect(() => {
    const interval = setInterval(() => {
      const savedState = localStorage.getItem('masterViewingAllAccounts');
      const currentState = savedState === 'true';
      if (currentState !== viewingAllAccounts) {
        console.log('[DEBUG] Analytics: Syncing viewing all accounts state:', currentState);
        setViewingAllAccounts(currentState);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [viewingAllAccounts]);

  // Fetch all review cycles with feedback data
  useEffect(() => {
    async function fetchReviewCycles() {
      if (authState !== "Authenticated" || !user?.id) return;
      
      setIsLoading(true);
      try {
        console.log("[DEBUG] Fetching review cycles for analytics:", { user: user.id, viewingAllAccounts, isMasterAccount });
        
        // Build query to fetch review cycles
        let query = supabase
          .from('review_cycles')
          .select(`
            *,
            feedback_requests:feedback_requests(
              *,
              employee:employees(*),
              feedback_responses(*),
              analytics:feedback_analytics(
                id,
                insights
              )
            )
          `)
          .order('created_at', { ascending: false });
        
        // Only filter by user_id if not a master account or not viewing all accounts
        const shouldFilterByUser = !isMasterAccount || !viewingAllAccounts;
        
        if (shouldFilterByUser) {
          console.log('[DEBUG] Filtering analytics by user_id:', user.id);
          query = query.eq('user_id', user.id);
        } else {
          console.log('[DEBUG] Showing all analytics data (master account mode)');
        }
        
        const { data: reviewCycles, error: cyclesError } = await query;

        if (cyclesError) {
          console.error('Error fetching review cycles:', cyclesError);
          toast({
            title: 'Error fetching review cycles',
            description: cyclesError.message,
            variant: 'destructive',
          });
        } else if (reviewCycles) {
          console.log("Fetched review cycles:", reviewCycles);
          setAllReviewCycles(reviewCycles);

          // If no cycle is selected, use the most recent one
          const cycleToShow = selectedCycleId 
            ? reviewCycles.find(c => c.id === selectedCycleId) 
            : reviewCycles[0];

          if (cycleToShow) {
            console.log("Selected cycle:", cycleToShow);
            
            // Add indicator for cycles from other users
            const enhancedCycle = {
              ...cycleToShow,
              isFromOtherUser: cycleToShow.user_id !== user.id
            };
            
            // Map the feedback requests to ensure they match the DashboardFeedbackRequest type
            const mappedRequests = cycleToShow.feedback_requests?.map((request: any) => {
              console.log("Processing request:", request);
              console.log("Analytics data:", request.analytics);
              
              return {
                id: request.id,
                employee_id: request.employee_id,
                review_cycle_id: request.review_cycle_id,
                status: request.status,
                target_responses: request.target_responses,
                unique_link: request.unique_link,
                created_at: request.created_at,
                employee: request.employee,
                feedback_responses: request.feedback_responses,
                analytics: request.analytics ? {
                  id: request.analytics.id,
                  insights: request.analytics.insights.map((insight: any) => ({
                    relationship: insight.relationship,
                    competencies: insight.competencies.map((comp: any) => ({
                      name: comp.name,
                      score: comp.score,
                      confidence: comp.confidence,
                      description: comp.description,
                      evidenceCount: comp.evidenceCount,
                      evidenceQuotes: comp.evidenceQuotes || []
                    }))
                  }))
                } : undefined
              };
            }) || [];

            console.log("Mapped requests:", mappedRequests);
            
            const mappedReviewCycle = {
              ...enhancedCycle,
              feedback_requests: mappedRequests
            };

            console.log("Final mapped cycle:", mappedReviewCycle);
            setActiveReviewCycle(mappedReviewCycle);
            
            // Fetch survey questions if it's a manager effectiveness survey
            if (cycleToShow.type === 'manager_effectiveness') {
              fetchSurveyQuestions(cycleToShow.type);
            }
          }
        } else {
          console.log("No review cycles found");
        }
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch review cycle data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchReviewCycles();
  }, [authState, user?.id, selectedCycleId, toast, isMasterAccount, viewingAllAccounts]);

  // Fetch survey questions for manager effectiveness surveys
  const fetchSurveyQuestions = async (cycleType: ReviewCycleType) => {
    try {
      const { data, error } = await supabase
        .from('survey_questions')
        .select('id, question_text')
        .eq('review_cycle_type', cycleType);

      if (error) throw error;

      if (!data || data.length === 0) {
        console.warn(`No questions found for survey type: ${cycleType}`);
        return;
      }

      // Create a map of question IDs to question text
      const questionMap: Record<string, string> = {};
      
      data.forEach(question => {
        questionMap[question.id] = question.question_text;
      });

      setSurveyQuestions(questionMap);
      console.log(`Loaded ${data.length} questions for survey type: ${cycleType}`);
    } catch (err) {
      console.error('Error fetching survey questions:', err);
      toast({
        title: "Error",
        description: "Could not load survey questions. Some question text may not display correctly.",
        variant: "destructive",
      });
    }
  };

  const handleCycleChange = (cycleId: string) => {
    localStorage.setItem('selectedCycleId', cycleId);
    setSelectedCycleId(cycleId);
    // Reset employee selection when cycle changes
    setSelectedEmployeeIds([]);
    setFilters(current => ({ ...current, employeeIds: [] }));
    
    // Find the selected cycle
    const selectedCycle = allReviewCycles.find(c => c.id === cycleId);
    
    // Fetch survey questions if it's a manager effectiveness survey
    if (selectedCycle?.type === 'manager_effectiveness') {
      fetchSurveyQuestions(selectedCycle.type);
    }
  };

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployeeIds(current => {
      const newEmployees = current.includes(employeeId)
        ? current.filter(id => id !== employeeId)
        : [...current, employeeId];
      
      setFilters(current => ({
        ...current,
        employeeIds: newEmployees
      }));

      return newEmployees;
    });
  };

  const toggleRelationship = (relationship: BaseRelationshipType) => {
    setSelectedRelationships(current => {
      const newRelationships = current.includes(relationship)
        ? current.filter(r => r !== relationship)
        : [...current, relationship];
      
      // Update the filters state with mapped relationship types
      setFilters(current => ({
        ...current,
        relationships: newRelationships.map(r => RELATIONSHIP_MAPPING[r])
      }));

      return newRelationships;
    });
  };

  const resetFilters = () => {
    // Reset the filters state
    setFilters({
      employeeIds: [],
      relationships: []
    });
    // Reset selected employees
    setSelectedEmployeeIds([]);
    // Reset selected relationships
    setSelectedRelationships([]);
    // Reset minimum review count
    setMinReviewCount(1);
  };

  if (authState !== "Authenticated") {
    return null;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Analytics</h1>
        <div className="flex items-center justify-center min-h-[200px]">
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  const hasAnalytics = activeReviewCycle?.feedback_requests?.some(
    request => request.analytics && request.feedback_responses && request.feedback_responses.length > 0
  );

  const hasResponses = activeReviewCycle?.feedback_requests?.some(
    request => request.feedback_responses && request.feedback_responses.length > 0
  );

  const isManagerSurvey = activeReviewCycle?.type === 'manager_effectiveness';

  console.log("Has analytics:", hasAnalytics);
  console.log("Has responses:", hasResponses);
  console.log("Is manager survey:", isManagerSurvey);
  console.log("Active review cycle:", activeReviewCycle);
  console.log("Current filters:", filters);
  console.log("Selected employees:", selectedEmployeeIds);
  console.log("Selected relationships:", selectedRelationships);

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">
              Insights from your team's feedback
            </p>
          </div>

          <Select value={selectedCycleId || ''} onValueChange={handleCycleChange}>
            <SelectTrigger className="w-full md:w-[350px]">
              <SelectValue placeholder="Select review cycle" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto max-w-[400px]">
              {allReviewCycles.map((cycle) => (
                <SelectItem key={cycle.id} value={cycle.id}>
                  <div className="flex items-center">
                    {cycle.title}
                    {isMasterAccount && viewingAllAccounts && cycle.user_id !== user?.id && (
                      <Badge variant="outline" className="ml-2 bg-amber-100 text-xs">
                        Other User
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="mb-8">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>Filters</CardTitle>
              {(selectedRelationships.length > 0 || selectedEmployeeIds.length > 0 || (isManagerSurvey && minReviewCount > 1)) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={resetFilters}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-x-8 gap-y-4">
              {/* Review Cycle Filter */}
              <div className="min-w-[200px]">
                <label htmlFor="cycle-select" className="text-sm font-medium block mb-2">
                  Review Cycle
                </label>
                {allReviewCycles.length > 0 ? (
                  <Select
                    value={activeReviewCycle?.id}
                    onValueChange={handleCycleChange}
                  >
                    <SelectTrigger className="w-full">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Select a review cycle" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {allReviewCycles.map((cycle) => (
                        <SelectItem key={cycle.id} value={cycle.id}>
                          {cycle.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">No review cycles available</p>
                )}
              </div>

              {/* Employee Filter */}
              {activeReviewCycle?.feedback_requests && activeReviewCycle.feedback_requests.length > 0 && (
                <div className="flex-1 min-w-[300px]">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-medium">
                      {isManagerSurvey ? 'Managers' : 'Employees'}
                    </label>
                    {selectedEmployeeIds.length > 0 && (
                      <span className="text-xs text-orange-500 font-medium">
                        {selectedEmployeeIds.length} selected
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeReviewCycle.feedback_requests
                      .filter(request => request.employee)
                      .map(request => (
                        <Button
                          key={request.employee_id}
                          variant="outline"
                          size="sm"
                          onClick={() => toggleEmployee(request.employee_id)}
                          className="h-8 border-muted hover:bg-transparent"
                        >
                          <div className="flex items-center gap-1.5">
                            {selectedEmployeeIds.includes(request.employee_id) && (
                              <Check className="h-3.5 w-3.5 text-orange-500" />
                            )}
                            <span>
                              {Array.isArray(request.employee) 
                                ? request.employee[0]?.name 
                                : request.employee?.name}
                            </span>
                          </div>
                        </Button>
                      ))}
                  </div>
                </div>
              )}

              {/* Feedback Source Filter */}
              {!isManagerSurvey && (
                <div className="min-w-[300px]">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-medium">
                      Feedback Source
                    </label>
                    {selectedRelationships.length > 0 && (
                      <span className="text-xs text-orange-500 font-medium">
                        {selectedRelationships.length} selected
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {RELATIONSHIP_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        variant="outline"
                        size="sm"
                        onClick={() => toggleRelationship(option.value)}
                        className="h-8 border-muted hover:bg-transparent"
                      >
                        <div className="flex items-center gap-1.5">
                          {selectedRelationships.includes(option.value) && (
                            <Check className="h-3.5 w-3.5 text-orange-500" />
                          )}
                          <span>{option.label}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Review Count Filter for Manager Surveys */}
              {isManagerSurvey && (
                <div className="min-w-[200px]">
                  <label htmlFor="review-count" className="text-sm font-medium block mb-2">
                    Minimum Review Count
                  </label>
                  <Select
                    value={minReviewCount.toString()}
                    onValueChange={(value) => setMinReviewCount(parseInt(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select minimum reviews" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">≥ 1 review</SelectItem>
                      <SelectItem value="2">≥ 2 reviews</SelectItem>
                      <SelectItem value="3">≥ 3 reviews</SelectItem>
                      <SelectItem value="4">≥ 4 reviews</SelectItem>
                      <SelectItem value="5">≥ 5 reviews</SelectItem>
                      <SelectItem value="10">≥ 10 reviews</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Render appropriate analytics based on review cycle type */}
        {isManagerSurvey ? (
          hasResponses ? (
            <ManagerSurveyAnalytics 
              feedbackRequests={activeReviewCycle!.feedback_requests as DashboardFeedbackRequest[]}
              questionIdToTextMap={surveyQuestions}
              employeeFilters={selectedEmployeeIds}
              minReviewCount={minReviewCount}
            />
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  {activeReviewCycle ? 
                    "No feedback data available for analysis in the current manager survey." :
                    "Please create a manager effectiveness cycle and collect some feedback to see analytics."}
                </p>
              </CardContent>
            </Card>
          )
        ) : (
          hasAnalytics ? (
            <CompetencyAnalysis 
              feedbackRequests={activeReviewCycle!.feedback_requests as DashboardFeedbackRequest[]}
              showTeamStats={true}
              title="Team Competency Analysis"
              subtitle="Comprehensive view of your team's competency levels based on feedback data"
              filters={filters}
            />
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  {activeReviewCycle ? 
                    "No feedback data available for analysis in the current review cycle." :
                    "Please create a review cycle and collect some feedback to see analytics."}
                </p>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
} 