import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardFeedbackRequest } from '@/types/feedback/dashboard';
import { CoreFeedbackResponse } from '@/types/feedback/base';
import { ManagerComparisonChart } from './ManagerComparisonChart';

interface ManagerSurveyAnalyticsProps {
  feedbackRequests: DashboardFeedbackRequest[];
  questionIdToTextMap: Record<string, string>;
  employeeFilters?: string[];
  minReviewCount?: number;
}

// Helper function to get color based on score
function getScoreColor(score: number): { bg: string, border: string, text: string, fill: string } {
  if (score >= 4) return { 
    bg: "bg-green-50", 
    border: "border-green-500", 
    text: "text-green-700",
    fill: "bg-green-500"
  };
  if (score >= 3) return { 
    bg: "bg-yellow-50", 
    border: "border-yellow-500", 
    text: "text-yellow-700",
    fill: "bg-yellow-500"
  };
  return { 
    bg: "bg-red-50", 
    border: "border-red-500", 
    text: "text-red-700",
    fill: "bg-red-500"
  };
}

export function ManagerSurveyAnalytics({ 
  feedbackRequests, 
  questionIdToTextMap,
  employeeFilters = [],
  minReviewCount = 1
}: ManagerSurveyAnalyticsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  
  // Apply employee filters
  const filteredRequests = useMemo(() => {
    if (employeeFilters.length === 0) {
      return feedbackRequests;
    }
    return feedbackRequests.filter(request => 
      employeeFilters.includes(request.employee_id)
    );
  }, [feedbackRequests, employeeFilters]);
  
  // Calculate analytics data from all feedback responses
  const analyticsData = useMemo(() => {
    // Collect all numeric responses across all managers
    const allNumericResponses: Record<string, number[]> = {};
    let totalResponses = 0;
    let totalManagers = 0;
    const managerScores: Record<string, {
      name: string,
      averageScore: number,
      responsesCount: number,
      questionScores: Record<string, number[]>
    }> = {};
    
    filteredRequests.forEach(request => {
      if (!request.feedback_responses || !request.employee) return;
      
      const managerId = request.employee_id;
      const managerName = typeof request.employee === 'object' && 'name' in request.employee ? 
        request.employee.name : 'Unknown Manager';
      
      if (!managerScores[managerId]) {
        managerScores[managerId] = {
          name: managerName,
          averageScore: 0,
          responsesCount: 0,
          questionScores: {}
        };
        totalManagers++;
      }
      
      // Process each response
      request.feedback_responses.forEach(response => {
        // Cast response to CoreFeedbackResponse to access responses property
        const typedResponse = response as unknown as CoreFeedbackResponse;
        if (!typedResponse.responses) return;
        
        // Increment responses count for this manager
        managerScores[managerId].responsesCount++;
        totalResponses++;
        
        // Process responses by question
        const responses = typedResponse.responses;
        let managerTotalScore = 0;
        let managerScoreCount = 0;
        
        // Process each question response
        Object.entries(responses).forEach(([questionId, value]) => {
          // Skip non-numeric responses
          if (typeof value !== 'number') return;
          
          // Initialize arrays if needed
          if (!allNumericResponses[questionId]) {
            allNumericResponses[questionId] = [];
          }
          if (!managerScores[managerId].questionScores[questionId]) {
            managerScores[managerId].questionScores[questionId] = [];
          }
          
          // Add to overall and per-manager scores
          allNumericResponses[questionId].push(value);
          managerScores[managerId].questionScores[questionId].push(value);
          
          // Track for manager average score
          managerTotalScore += value;
          managerScoreCount++;
        });
        
        // Update manager average score
        if (managerScoreCount > 0) {
          managerScores[managerId].averageScore = 
            (managerScores[managerId].averageScore * 
             (managerScores[managerId].responsesCount - 1) + 
             (managerTotalScore / managerScoreCount)
            ) / managerScores[managerId].responsesCount;
        }
      });
    });
    
    // Calculate average score for each question
    const questionAverages = Object.entries(allNumericResponses).map(([questionId, scores]) => {
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      return {
        questionId,
        questionText: questionIdToTextMap[questionId] || `Question ${questionId}`,
        average,
        count: scores.length,
        // Calculate distribution
        distribution: scores.reduce((dist, score) => {
          dist[score] = (dist[score] || 0) + 1;
          return dist;
        }, {} as Record<number, number>),
        scores
      };
    }).sort((a, b) => b.average - a.average); // Sort by highest average
    
    // Calculate overall average score
    const overallAverage = questionAverages.reduce(
      (sum, q) => sum + q.average * q.count, 
      0
    ) / questionAverages.reduce(
      (sum, q) => sum + q.count, 
      0
    );
    
    // Filter managers by minimum review count and sort by score
    const filteredManagers = Object.values(managerScores)
      .filter(manager => manager.responsesCount >= minReviewCount)
      .sort((a, b) => b.averageScore - a.averageScore);
    
    // Recalculate overall average and question averages for filtered managers
    const filteredQuestionAverages = Object.entries(allNumericResponses).map(([questionId, scores]) => {
      // Get scores only from managers that meet the minimum review count
      const filteredScores: number[] = [];
      Object.values(managerScores).forEach(manager => {
        if (manager.responsesCount >= minReviewCount && manager.questionScores[questionId]) {
          filteredScores.push(...manager.questionScores[questionId]);
        }
      });
      
      if (filteredScores.length === 0) {
        return {
          questionId,
          questionText: questionIdToTextMap[questionId] || `Question ${questionId}`,
          average: 0,
          count: 0,
          distribution: {},
          scores: []
        };
      }
      
      const average = filteredScores.reduce((sum, score) => sum + score, 0) / filteredScores.length;
      return {
        questionId,
        questionText: questionIdToTextMap[questionId] || `Question ${questionId}`,
        average,
        count: filteredScores.length,
        distribution: filteredScores.reduce((dist, score) => {
          dist[score] = (dist[score] || 0) + 1;
          return dist;
        }, {} as Record<number, number>),
        scores: filteredScores
      };
    }).sort((a, b) => b.average - a.average);
    
    // Calculate overall average for filtered data
    const filteredOverallAverage = filteredQuestionAverages.length > 0 
      ? filteredQuestionAverages.reduce(
          (sum, q) => sum + q.average * q.count, 
          0
        ) / filteredQuestionAverages.reduce(
          (sum, q) => sum + q.count, 
          0
        )
      : 0;
    
    // Calculate total responses for filtered managers
    const filteredTotalResponses = filteredManagers.reduce(
      (sum, manager) => sum + manager.responsesCount, 
      0
    );
    
    return {
      overallAverage: filteredOverallAverage,
      questionAverages: filteredQuestionAverages,
      totalResponses: filteredTotalResponses,
      totalManagers: filteredManagers.length,
      managerScores: filteredManagers
    };
  }, [filteredRequests, questionIdToTextMap, minReviewCount]);
  
  // If no data, show a message
  if (analyticsData.totalResponses === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No feedback data available for analysis. Please collect some feedback to see manager analytics.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Format a percentile value for display
  const formatPercentile = (value: number): string => {
    return `${Math.round(value * 100)}%`;
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Manager Effectiveness Analysis</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Summary of manager effectiveness based on {analyticsData.totalResponses} responses across {analyticsData.totalManagers} manager{analyticsData.totalManagers !== 1 ? 's' : ''}
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <InfoIcon className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[300px]">
              <p className="text-sm">
                This analysis summarizes feedback from manager effectiveness surveys, 
                showing overall ratings and breakdowns by manager and question.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-lg">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="by-question">By Question</TabsTrigger>
            <TabsTrigger value="by-manager">By Manager</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Overall Score Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Overall Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold border-2",
                      getScoreColor(analyticsData.overallAverage).border,
                      getScoreColor(analyticsData.overallAverage).bg,
                      getScoreColor(analyticsData.overallAverage).text
                    )}>
                      {analyticsData.overallAverage.toFixed(1)}
                    </div>
                    <div className="flex-1">
                      <div className="h-3 mb-1 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full", getScoreColor(analyticsData.overallAverage).fill)}
                          style={{ width: `${(analyticsData.overallAverage / 5) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1</span>
                        <span>5</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Top Scoring Question */}
              {analyticsData.questionAverages.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Highest Rated Area</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-2 font-medium line-clamp-2 h-10" title={analyticsData.questionAverages[0].questionText}>
                      {analyticsData.questionAverages[0].questionText}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full", getScoreColor(analyticsData.questionAverages[0].average).fill)}
                          style={{ width: `${(analyticsData.questionAverages[0].average / 5) * 100}%` }}
                        ></div>
                      </div>
                      <div className={cn(
                        "text-sm font-medium min-w-8 text-right",
                        getScoreColor(analyticsData.questionAverages[0].average).text
                      )}>
                        {analyticsData.questionAverages[0].average.toFixed(1)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Lowest Scoring Question */}
              {analyticsData.questionAverages.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Needs Improvement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-2 font-medium line-clamp-2 h-10" title={analyticsData.questionAverages[analyticsData.questionAverages.length - 1].questionText}>
                      {analyticsData.questionAverages[analyticsData.questionAverages.length - 1].questionText}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full", 
                            getScoreColor(analyticsData.questionAverages[analyticsData.questionAverages.length - 1].average).fill
                          )}
                          style={{ 
                            width: `${(analyticsData.questionAverages[analyticsData.questionAverages.length - 1].average / 5) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <div className={cn(
                        "text-sm font-medium min-w-8 text-right",
                        getScoreColor(analyticsData.questionAverages[analyticsData.questionAverages.length - 1].average).text
                      )}>
                        {analyticsData.questionAverages[analyticsData.questionAverages.length - 1].average.toFixed(1)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {/* Manager Comparison Chart */}
            {analyticsData.managerScores.length > 1 && (
              <div className="mt-6">
                <ManagerComparisonChart 
                  managerScores={analyticsData.managerScores}
                  questionIdToTextMap={questionIdToTextMap}
                />
              </div>
            )}
            
            {/* Top and Bottom Managers */}
            {analyticsData.managerScores.length > 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {/* Top Manager */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Highest Rated Manager</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-medium">{analyticsData.managerScores[0].name}</h3>
                      <div className={cn(
                        "text-sm font-medium px-2 py-1 rounded",
                        getScoreColor(analyticsData.managerScores[0].averageScore).bg,
                        getScoreColor(analyticsData.managerScores[0].averageScore).text
                      )}>
                        {analyticsData.managerScores[0].averageScore.toFixed(1)}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Based on {analyticsData.managerScores[0].responsesCount} responses
                    </div>
                  </CardContent>
                </Card>
                
                {/* Bottom Manager */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Lowest Rated Manager</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-medium">
                        {analyticsData.managerScores[analyticsData.managerScores.length - 1].name}
                      </h3>
                      <div className={cn(
                        "text-sm font-medium px-2 py-1 rounded",
                        getScoreColor(analyticsData.managerScores[analyticsData.managerScores.length - 1].averageScore).bg,
                        getScoreColor(analyticsData.managerScores[analyticsData.managerScores.length - 1].averageScore).text
                      )}>
                        {analyticsData.managerScores[analyticsData.managerScores.length - 1].averageScore.toFixed(1)}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Based on {analyticsData.managerScores[analyticsData.managerScores.length - 1].responsesCount} responses
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
          
          {/* By Question Tab */}
          <TabsContent value="by-question" className="space-y-6">
            <div className="border rounded-md divide-y">
              {analyticsData.questionAverages.map((question) => {
                const scoreColor = getScoreColor(question.average);
                return (
                  <div key={question.questionId} className="p-4">
                    <div className="mb-3">
                      <h3 className="font-medium mb-1 break-words pr-4" title={question.questionText}>
                        {question.questionText}
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "text-sm font-medium px-2 py-0.5 rounded",
                          scoreColor.bg,
                          scoreColor.text
                        )}>
                          {question.average.toFixed(1)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {question.count} responses
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full", scoreColor.fill)}
                          style={{ width: `${(question.average / 5) * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-muted-foreground min-w-10 text-right">
                        {formatPercentile(question.average / 5)}
                      </div>
                    </div>
                    
                    {/* Response Distribution */}
                    <div className="mt-3 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <div key={score} className="flex-1">
                          <div className="text-xs text-center mb-1">{score}</div>
                          <div className="h-8 bg-gray-100 rounded relative">
                            <div 
                              className={cn(
                                "absolute bottom-0 left-0 right-0 bg-gray-300",
                                score === 1 && "bg-red-200",
                                score === 2 && "bg-orange-200",
                                score === 3 && "bg-yellow-200",
                                score === 4 && "bg-green-200",
                                score === 5 && "bg-emerald-200"
                              )}
                              style={{ 
                                height: `${(((question.distribution[score] || 0) / question.count) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <div className="text-xs text-center mt-1">
                            {((question.distribution[score] || 0) / question.count * 100).toFixed(0)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
          
          {/* By Manager Tab */}
          <TabsContent value="by-manager" className="space-y-6">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {analyticsData.managerScores.map((manager) => {
                const scoreColor = getScoreColor(manager.averageScore);
                
                // Find best and worst question for this manager
                const questionsWithScores = Object.entries(manager.questionScores).map(([questionId, scores]) => {
                  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
                  return {
                    questionId,
                    questionText: questionIdToTextMap[questionId] || `Question ${questionId}`,
                    average,
                    count: scores.length
                  };
                });
                
                const bestQuestion = questionsWithScores.sort((a, b) => b.average - a.average)[0];
                const worstQuestion = questionsWithScores.sort((a, b) => a.average - b.average)[0];
                
                return (
                  <Card key={manager.name} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{manager.name}</CardTitle>
                        <div className={cn(
                          "text-sm font-medium px-2 py-1 rounded",
                          scoreColor.bg,
                          scoreColor.text
                        )}>
                          {manager.averageScore.toFixed(1)}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Based on {manager.responsesCount} responses
                      </p>
                    </CardHeader>
                    <CardContent className="pb-4">
                      {/* Overall score progress */}
                      <div className="h-2.5 mb-3 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full", scoreColor.fill)}
                          style={{ width: `${(manager.averageScore / 5) * 100}%` }}
                        ></div>
                      </div>
                      
                      {/* Strengths and weaknesses */}
                      <div className="grid grid-cols-1 gap-3 mt-4">
                        {bestQuestion && (
                          <div className="space-y-1">
                            <h4 className="text-xs font-medium text-green-700">Strength</h4>
                            <p className="text-sm line-clamp-2" title={bestQuestion.questionText}>{bestQuestion.questionText}</p>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full bg-green-500"
                                  style={{ width: `${(bestQuestion.average / 5) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-green-700">
                                {bestQuestion.average.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {worstQuestion && bestQuestion?.questionId !== worstQuestion?.questionId && (
                          <div className="space-y-1">
                            <h4 className="text-xs font-medium text-orange-700">Area for Improvement</h4>
                            <p className="text-sm line-clamp-2" title={worstQuestion.questionText}>{worstQuestion.questionText}</p>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full bg-orange-500"
                                  style={{ width: `${(worstQuestion.average / 5) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-orange-700">
                                {worstQuestion.average.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 