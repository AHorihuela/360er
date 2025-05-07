import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CoreFeedbackResponse } from '@/types/feedback/base';
import { cn } from '@/lib/utils';
import { Sparkles, TrendingUp, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';

interface ManagerSurveyAnalyticsProps {
  feedbackResponses: CoreFeedbackResponse[];
  questionIdToTextMap: Record<string, string>;
  questionOrder: Record<string, number>;
}

// Helper function to calculate average score and response count for a question
function calculateMetrics(responses: CoreFeedbackResponse[], questionId: string) {
  let sum = 0;
  let count = 0;
  
  // Distribution will track how many responses for each value (1-5)
  const distribution: Record<number, number> = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
  
  for (const response of responses) {
    if (response.responses && typeof response.responses[questionId] === 'number') {
      const value = response.responses[questionId] as number;
      sum += value;
      count++;
      distribution[value] = (distribution[value] || 0) + 1;
    }
  }
  
  const average = count > 0 ? sum / count : 0;
  
  return {
    average: parseFloat(average.toFixed(1)),
    count,
    distribution
  };
}

// Helper to get color based on score
function getScoreColor(score: number) {
  if (score < 2) return "text-red-500";
  if (score < 3) return "text-orange-500";
  if (score < 4) return "text-yellow-500";
  if (score < 4.5) return "text-green-500";
  return "text-emerald-500";
}

// Helper to get background color based on score
function getScoreBackgroundColor(score: number) {
  if (score < 2) return "bg-red-100";
  if (score < 3) return "bg-orange-100";
  if (score < 4) return "bg-yellow-100";
  if (score < 4.5) return "bg-green-100";
  return "bg-emerald-100";
}

// Get the appropriate emoji for a score
function getScoreEmoji(score: number) {
  if (score < 2) return <AlertCircle className="h-5 w-5 text-red-500" />;
  if (score < 3) return <AlertCircle className="h-5 w-5 text-orange-500" />;
  if (score < 4) return <TrendingUp className="h-5 w-5 text-yellow-500" />;
  if (score < 4.5) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  return <Sparkles className="h-5 w-5 text-emerald-500" />;
}

const LOCAL_STORAGE_KEY = 'managerSurveyAnalyticsExpanded';

export function ManagerSurveyAnalytics({ 
  feedbackResponses,
  questionIdToTextMap,
  questionOrder
}: ManagerSurveyAnalyticsProps) {
  // Initialize from localStorage or default to true
  const [isExpanded, setIsExpanded] = useState(() => {
    // Only run in browser environment
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
      return savedState ? JSON.parse(savedState) : true;
    }
    return true;
  });
  
  // Save to localStorage whenever isExpanded changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(isExpanded));
    }
  }, [isExpanded]);
  
  // Calculate overall average and metrics for each question
  const { 
    overallAverage,
    questionMetrics,
    totalResponses,
    sortedQuestionIds
  } = useMemo(() => {
    // Filter to only have numeric (Likert) questions
    const numericQuestionIds = Object.entries(questionIdToTextMap)
      .filter(([id, text]) => {
        // Skip questions that look like open-ended ones
        return !text.toLowerCase().includes('what could') && 
               !text.toLowerCase().includes('what is one suggestion') &&
               !text.toLowerCase().includes('additional feedback');
      })
      .map(([id]) => id);
    
    // Sort the questions by their order
    const sortedIds = [...numericQuestionIds].sort((a, b) => {
      return (questionOrder[a] || 999) - (questionOrder[b] || 999);
    });
    
    // Calculate metrics for each question
    const metrics: Record<string, {average: number, count: number, distribution: Record<number, number>}> = {};
    let totalSum = 0;
    let totalCount = 0;
    
    sortedIds.forEach(questionId => {
      const questionMetrics = calculateMetrics(feedbackResponses, questionId);
      metrics[questionId] = questionMetrics;
      
      totalSum += questionMetrics.average * questionMetrics.count;
      totalCount += questionMetrics.count;
    });
    
    return {
      overallAverage: totalCount > 0 ? parseFloat((totalSum / totalCount).toFixed(1)) : 0,
      questionMetrics: metrics,
      totalResponses: feedbackResponses.length,
      sortedQuestionIds: sortedIds
    };
  }, [feedbackResponses, questionIdToTextMap, questionOrder]);

  if (feedbackResponses.length === 0) {
    return null;
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors py-3"
        onClick={toggleExpanded}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Manager Effectiveness Summary</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
              {totalResponses} {totalResponses === 1 ? 'Response' : 'Responses'}
            </div>
            <ChevronDown className={cn("h-5 w-5 transition-transform", isExpanded && "rotate-180")} />
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          {/* Overall Score Card */}
          <div className="mb-6 flex items-center justify-between p-4 rounded-lg bg-slate-50">
            <div>
              <h4 className="text-sm font-medium text-slate-500 mb-1">Overall Effectiveness</h4>
              <div className="text-3xl font-bold flex items-center gap-2">
                <span className={getScoreColor(overallAverage)}>{overallAverage}</span>
                <span className="text-sm font-normal text-slate-400">/ 5.0</span>
              </div>
            </div>
            <div className={cn(
              "p-4 rounded-full",
              getScoreBackgroundColor(overallAverage)
            )}>
              {getScoreEmoji(overallAverage)}
            </div>
          </div>
          
          {/* Individual Question Metrics */}
          <div className="space-y-4">
            {sortedQuestionIds.map(questionId => {
              const { average, count, distribution } = questionMetrics[questionId];
              const questionText = questionIdToTextMap[questionId] || `Question ${questionId.slice(0, 8)}...`;
              
              // Calculate percentage for distribution bars
              const totalVotes = Object.values(distribution).reduce((sum, count) => sum + count, 0);
              const distributionPercentages = Object.entries(distribution).map(([value, count]) => ({
                value: Number(value),
                percentage: totalVotes > 0 ? (count / totalVotes) * 100 : 0
              }));
              
              return (
                <div key={questionId} className="pb-4 border-b border-slate-100 last:border-0">
                  <h4 className="text-sm font-medium mb-2 line-clamp-2" title={questionText}>
                    {questionText}
                  </h4>
                  
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "px-2 py-1 rounded-md text-sm font-medium",
                        getScoreBackgroundColor(average),
                        getScoreColor(average)
                      )}>
                        {average}
                      </div>
                      <span className="text-xs text-slate-500">
                        ({count} {count === 1 ? 'response' : 'responses'})
                      </span>
                    </div>
                  </div>
                  
                  {/* Distribution bars */}
                  <div className="grid grid-cols-5 gap-1 mt-2">
                    {[5, 4, 3, 2, 1].map(value => {
                      const item = distributionPercentages.find(d => d.value === value);
                      const percentage = item ? item.percentage : 0;
                      
                      return (
                        <div key={value} className="flex flex-col items-center">
                          <div className="w-full h-1.5 bg-slate-100 rounded overflow-hidden">
                            <div 
                              className={cn(
                                "h-full",
                                value === 5 && "bg-emerald-400",
                                value === 4 && "bg-green-400",
                                value === 3 && "bg-yellow-400",
                                value === 2 && "bg-orange-400",
                                value === 1 && "bg-red-400",
                              )}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 mt-1">{value}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
} 