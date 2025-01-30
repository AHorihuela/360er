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
  const { authState, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
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

  useEffect(() => {
    if (authState !== "Authenticated") {
      navigate("/login");
    }
  }, [authState, navigate]);

  // Fetch all review cycles with feedback data
  useEffect(() => {
    async function fetchReviewCycles() {
      if (authState !== "Authenticated" || !user?.id) return;
      
      setIsLoading(true);
      try {
        console.log("Fetching review cycles for user:", user.id);
        const { data: reviewCycles, error: cyclesError } = await supabase
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
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

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
              ...cycleToShow,
              feedback_requests: mappedRequests
            };

            console.log("Final mapped cycle:", mappedReviewCycle);
            setActiveReviewCycle(mappedReviewCycle);
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
  }, [authState, user?.id, selectedCycleId, toast]);

  const handleCycleChange = (cycleId: string) => {
    localStorage.setItem('selectedCycleId', cycleId);
    setSelectedCycleId(cycleId);
    // Reset employee selection when cycle changes
    setSelectedEmployeeIds([]);
    setFilters(current => ({ ...current, employeeIds: [] }));
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

  console.log("Has analytics:", hasAnalytics);
  console.log("Active review cycle:", activeReviewCycle);
  console.log("Current filters:", filters);
  console.log("Selected employees:", selectedEmployeeIds);
  console.log("Selected relationships:", selectedRelationships);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Analytics</h1>
      
      <Card className="mb-8">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>Filters</CardTitle>
            {(selectedRelationships.length > 0 || selectedEmployeeIds.length > 0) && (
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
                  <SelectContent>
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
                    Employees
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
          </div>
        </CardContent>
      </Card>

      {hasAnalytics ? (
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
      )}
    </div>
  );
} 