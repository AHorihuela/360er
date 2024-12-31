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

interface Props {
  reviewCycle: ReviewCycle;
}

interface CompetencyScore {
  score: number;
  confidence: 'low' | 'medium' | 'high';
  sampleSize: number;
}

interface AggregateAnalytics {
  [key: string]: CompetencyScore;
}

interface Competency {
  name: string;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  description: string;
  evidenceCount: number;
}

interface FeedbackAnalytics {
  id: string;
  insights: Array<{
    competencies: Array<Competency>;
    relationship: string;
  }>;
}

export function CycleAnalytics({ reviewCycle }: Props) {
  if (!reviewCycle.feedback_requests) return null;

  // Aggregate analytics across all employees
  const aggregateAnalytics: AggregateAnalytics = {};
  let totalEmployeesWithAnalytics = 0;

  // Get the list of employees with and without analytics
  const employeeBreakdown = reviewCycle.feedback_requests.map(r => ({
    name: r.employee?.name || 'Unknown',
    hasAnalytics: !!r.analytics?.insights
  }));

  reviewCycle.feedback_requests.forEach((request: FeedbackRequest) => {
    if (!request.analytics?.insights) return;

    // Find the aggregate insights
    const aggregateInsight = request.analytics.insights.find(insight => insight.relationship === 'aggregate');
    if (!aggregateInsight?.competencies) return;

    totalEmployeesWithAnalytics++;
    aggregateInsight.competencies.forEach(comp => {
      if (!aggregateAnalytics[comp.name]) {
        aggregateAnalytics[comp.name] = {
          score: 0,
          confidence: comp.confidence,
          sampleSize: 0
        };
      }
      aggregateAnalytics[comp.name].score += comp.score;
      aggregateAnalytics[comp.name].sampleSize++;
      
      // Update confidence level (take the most conservative)
      if (comp.confidence === 'low' || 
         (comp.confidence === 'medium' && aggregateAnalytics[comp.name].confidence === 'high')) {
        aggregateAnalytics[comp.name].confidence = comp.confidence;
      }
    });
  });

  // Calculate averages
  Object.keys(aggregateAnalytics).forEach(key => {
    aggregateAnalytics[key].score = aggregateAnalytics[key].score / aggregateAnalytics[key].sampleSize;
  });

  // Sort competencies by score
  const sortedCompetencies = Object.entries(aggregateAnalytics)
    .sort(([, a], [, b]) => b.score - a.score);

  if (sortedCompetencies.length === 0) return null;

  return (
    <Card className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Team Competency Analysis</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-xs">
                  Based on {totalEmployeesWithAnalytics} employees
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px] p-4">
                <p className="font-medium mb-2">Employee Analytics Status:</p>
                <ul className="text-sm space-y-1">
                  {employeeBreakdown.map(({ name, hasAnalytics }) => (
                    <li key={name} className="flex items-center gap-2">
                      <span>{hasAnalytics ? '✓' : '×'}</span>
                      <span>{name}</span>
                    </li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="space-y-6">
          {sortedCompetencies.map(([name, data]) => (
            <div key={name} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="font-medium text-sm">{name}</h3>
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge 
                            variant={data.confidence === 'high' ? 'default' : 
                                    data.confidence === 'medium' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {data.confidence} confidence
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="p-3">
                          <p className="max-w-[200px] text-sm">
                            {data.confidence === 'high' && 
                              "High confidence: Based on consistent feedback across multiple reviewers with specific examples"
                            }
                            {data.confidence === 'medium' && 
                              "Medium confidence: Based on multiple pieces of feedback, but may lack specific examples or show some variance"
                            }
                            {data.confidence === 'low' && 
                              "Low confidence: Limited feedback or significant variance in assessments"
                            }
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="text-xs text-muted-foreground">
                      {data.sampleSize} reviews
                    </span>
                  </div>
                </div>
                <span className="font-semibold">
                  {data.score.toFixed(1)}/5
                </span>
              </div>
              <Progress 
                value={data.score * 20} 
                className="h-2"
              />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
} 