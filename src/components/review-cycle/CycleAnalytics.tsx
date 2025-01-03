import { Card } from "@/components/ui/card";
import { ReviewCycle, FeedbackRequest } from '@/types/review';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { CORE_COMPETENCIES } from '@/lib/competencies';

interface Props {
  reviewCycle: ReviewCycle;
}

interface CompetencyScore {
  score: number | null;
  confidence: 'low' | 'medium' | 'high';
  sampleSize: number;
  evidenceCount: number;
  isInsufficientData?: boolean;
}

interface AggregateAnalytics {
  [key: string]: CompetencyScore;
}

export interface Competency {
  name: string;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  description: string;
  evidenceCount: number;
}

export function CycleAnalytics({ reviewCycle }: Props) {
  if (!reviewCycle.feedback_requests) return null;

  const MINIMUM_REVIEWS_REQUIRED = 5;

  // Get the list of employees with and without sufficient reviews
  const employeeBreakdown = reviewCycle.feedback_requests.map(r => ({
    name: r.employee?.name || 'Unknown',
    reviewCount: r.feedback_responses?.length || 0,
    hasAnalytics: !!r.analytics?.insights && (r.feedback_responses?.length || 0) >= MINIMUM_REVIEWS_REQUIRED
  }));

  // Aggregate analytics across all employees
  const aggregateAnalytics: AggregateAnalytics = {};
  let totalEmployeesWithAnalytics = 0;
  let totalEmployeesWithSufficientReviews = 0;

  reviewCycle.feedback_requests.forEach((request: FeedbackRequest) => {
    const reviewCount = request.feedback_responses?.length || 0;
    if (reviewCount >= MINIMUM_REVIEWS_REQUIRED) {
      totalEmployeesWithSufficientReviews++;
    }

    // Skip if no analytics or insufficient reviews
    if (!request.analytics?.insights || reviewCount < MINIMUM_REVIEWS_REQUIRED) return;

    // Find the aggregate insights
    const aggregateInsight = request.analytics.insights.find(insight => insight.relationship === 'aggregate');
    if (!aggregateInsight?.competencies) return;

    totalEmployeesWithAnalytics++;
    aggregateInsight.competencies.forEach(comp => {
      const isInsufficientData = comp.score === 0 || comp.evidenceCount === 0;

      if (!aggregateAnalytics[comp.name]) {
        aggregateAnalytics[comp.name] = {
          score: isInsufficientData ? null : comp.score,
          confidence: comp.confidence,
          sampleSize: 0,
          evidenceCount: 0,
          isInsufficientData
        };
      } else {
        if (!isInsufficientData) {
          if (aggregateAnalytics[comp.name].score === null) {
            aggregateAnalytics[comp.name].score = comp.score;
          } else {
            aggregateAnalytics[comp.name].score! += comp.score;
          }
        }
      }
      
      aggregateAnalytics[comp.name].sampleSize++;
      
      // Update confidence level (take the most conservative)
      if (comp.confidence === 'low' || 
         (comp.confidence === 'medium' && aggregateAnalytics[comp.name].confidence === 'high')) {
        aggregateAnalytics[comp.name].confidence = comp.confidence;
      }

      // Mark as insufficient if majority of samples are insufficient
      if (aggregateAnalytics[comp.name].isInsufficientData) {
        const insufficientCount = aggregateAnalytics[comp.name].sampleSize;
        if (insufficientCount > totalEmployeesWithAnalytics / 2) {
          aggregateAnalytics[comp.name].score = null;
          aggregateAnalytics[comp.name].confidence = 'low';
          aggregateAnalytics[comp.name].isInsufficientData = true;
        }
      }
    });
  });

  // Calculate averages for non-insufficient data
  Object.keys(aggregateAnalytics).forEach(key => {
    const analytics = aggregateAnalytics[key];
    if (!analytics.isInsufficientData && analytics.score !== null) {
      analytics.score = analytics.score / analytics.sampleSize;
    }
  });

  // Sort competencies by score (null scores at the end)
  const sortedCompetencies = Object.entries(aggregateAnalytics)
    .sort(([, a], [, b]) => {
      if (a.score === null && b.score === null) return 0;
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return b.score - a.score;
    });

  if (sortedCompetencies.length === 0) return null;

  // If no employees have sufficient reviews, show a message
  if (totalEmployeesWithSufficientReviews === 0) {
    return (
      <Card className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <div className="flex items-start gap-6">
            <div className="rounded-full bg-muted/50 p-4 shrink-0">
              <Info className="h-6 w-6 text-muted-foreground" />
            </div>
            
            <div className="space-y-4 flex-1">
              <div>
                <h3 className="text-lg font-semibold">Team Competency Analysis</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This feature provides an overview of your team's collective strengths and areas for development. 
                  Each team member needs {MINIMUM_REVIEWS_REQUIRED} reviews to be included.
                </p>
              </div>

              <div className="bg-muted/30 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Team Review Status</p>
                  <p className="text-xs text-muted-foreground">
                    {MINIMUM_REVIEWS_REQUIRED} reviews needed per member
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {employeeBreakdown.map(({ name, reviewCount }) => (
                    <div key={name} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground truncate flex-shrink-0 w-24">{name}</span>
                      <Progress 
                        value={(reviewCount / MINIMUM_REVIEWS_REQUIRED) * 100} 
                        className="h-1.5 flex-1"
                      />
                      <span className={cn(
                        "text-xs flex-shrink-0",
                        reviewCount >= MINIMUM_REVIEWS_REQUIRED ? "text-primary" : "text-muted-foreground"
                      )}>
                        {reviewCount}/{MINIMUM_REVIEWS_REQUIRED}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Update the tooltip content to show review counts
  return (
    <Card className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Team Competency Analysis</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-xs">
                  Based on {totalEmployeesWithAnalytics} of {reviewCycle.feedback_requests.length} employees
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px] p-4">
                <p className="font-medium mb-2">Employee Analytics Status:</p>
                <ul className="text-sm space-y-1">
                  {employeeBreakdown.map(({ name, reviewCount, hasAnalytics }) => (
                    <li key={name} className="flex items-center gap-2">
                      <span>{hasAnalytics ? '✓' : reviewCount < MINIMUM_REVIEWS_REQUIRED ? '!' : '×'}</span>
                      <span>{name}</span>
                      <span className="text-muted-foreground">
                        ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                      </span>
                    </li>
                  ))}
                </ul>
                {totalEmployeesWithSufficientReviews < reviewCycle.feedback_requests.length && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Note: Employees need {MINIMUM_REVIEWS_REQUIRED} reviews to be included in the analysis.
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="space-y-6">
          {sortedCompetencies.map(([name, data]) => (
            <div key={name} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className={cn(
                      "font-medium text-sm",
                      data.isInsufficientData && "text-muted-foreground"
                    )}>{name}</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">
                          <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent side="right" align="start" className="max-w-[280px] p-4 space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2">Team Score Components</h4>
                            <ul className="space-y-1.5 text-sm">
                              <li className="flex gap-2">
                                <span className="text-muted-foreground">•</span>
                                Based on {data.sampleSize} team {data.sampleSize === 1 ? 'member' : 'members'} with reviews
                              </li>
                              <li className="flex gap-2">
                                <span className="text-muted-foreground">•</span>
                                {data.evidenceCount || 0} {(data.evidenceCount || 0) === 1 ? 'reviewer' : 'reviewers'} provided specific feedback
                              </li>
                              <li className="flex gap-2">
                                <span className="text-muted-foreground">•</span>
                                Confidence: {data.confidence} ({
                                  data.isInsufficientData ? 'Insufficient data' :
                                  (data.evidenceCount || 0) <= 2 ? '0-2 reviewers provided evidence' :
                                  (data.evidenceCount || 0) === 3 ? '3 reviewers provided evidence' :
                                  '4+ reviewers provided evidence'
                                })
                              </li>
                              {(data.evidenceCount || 0) === 0 && data.score !== null && (
                                <li className="flex gap-2 text-muted-foreground/80 italic">
                                  <span className="text-muted-foreground">•</span>
                                  Score is derived from general feedback patterns rather than specific examples
                                </li>
                              )}
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Key Aspects Evaluated</h4>
                            <ul className="space-y-1.5 text-sm">
                              {Object.entries(CORE_COMPETENCIES).find(([_, comp]) => 
                                comp.name === name
                              )?.[1]?.aspects?.map(aspect => (
                                <li key={aspect} className="flex gap-2">
                                  <span className="text-muted-foreground">•</span>
                                  {aspect}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Score Meaning ({data.score}/5)</h4>
                            <p className="text-sm">
                              {(() => {
                                const foundComp = Object.entries(CORE_COMPETENCIES).find(([_, comp]) => 
                                  comp.name === name
                                )?.[1];
                                return data.score && foundComp?.rubric ? 
                                  foundComp.rubric[Math.round(data.score) as keyof typeof foundComp.rubric] : 
                                  'Insufficient data to provide score meaning';
                              })()}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <span className={cn(
                  "font-semibold",
                  data.isInsufficientData && "text-muted-foreground"
                )}>
                  {data.score === null ? 'N/A' : `${data.score.toFixed(1)}/5`}
                </span>
              </div>
              <Progress 
                value={data.score === null ? 0 : data.score * 20} 
                className={cn(
                  "h-2",
                  (data.isInsufficientData || data.confidence === 'low') && "bg-gray-200 [&>div]:bg-gray-400"
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
} 