import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type CompetencyFilters } from "@/components/analytics/CompetencyAnalysis/types";
import { CompetencyAnalysis } from "@/components/competency/CompetencyAnalysis";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { type ReviewCycle } from "@/types/review";
import { type DashboardFeedbackRequest } from "@/types/feedback/dashboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    relationships: [],
    cycleIds: [],
  });

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
    // Save to localStorage when cycle changes (syncs with dashboard)
    localStorage.setItem('selectedCycleId', cycleId);
    setSelectedCycleId(cycleId);
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

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Analytics</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col space-y-1.5">
              <label htmlFor="cycle-select" className="text-sm font-medium">
                Review Cycle
              </label>
              {allReviewCycles.length > 0 ? (
                <Select
                  value={activeReviewCycle?.id}
                  onValueChange={handleCycleChange}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select a review cycle" />
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
            {/* Additional filters will go here */}
          </div>
        </CardContent>
      </Card>

      {hasAnalytics ? (
        <CompetencyAnalysis 
          feedbackRequests={activeReviewCycle!.feedback_requests as DashboardFeedbackRequest[]}
          showTeamStats={true}
          title="Team Competency Analysis"
          subtitle="Comprehensive view of your team's competency levels based on feedback data"
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