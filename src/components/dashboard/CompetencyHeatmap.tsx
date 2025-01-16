import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoIcon } from 'lucide-react';
import { CORE_COMPETENCIES } from '@/lib/competencies';
import { CompetencyHeatmapProps, ScoreWithOutlier, ChartDataPoint, COMPETENCY_ORDER } from './types';
import { MIN_REVIEWS_REQUIRED, RELATIONSHIP_WEIGHTS, CONFIDENCE_WEIGHTS } from './constants';
import { detectOutliers, calculateConfidence } from './utils';
import { CompetencyRadarChart } from './CompetencyRadarChart';
import { CompetencyScoreCard } from './CompetencyScoreCard';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function CompetencyHeatmap({ feedbackRequests }: CompetencyHeatmapProps) {
  const [expandedCompetency, setExpandedCompetency] = useState<string | null>(null);

  // Get all responses that have been submitted
  const responses = feedbackRequests.flatMap(fr => fr.feedback_responses || []);
  if (responses.length === 0) return null;

  // Count employees with sufficient responses and analytics
  const employeesWithSufficientData = feedbackRequests
    .filter(fr => {
      const responseCount = fr.feedback_responses?.length || 0;
      const hasAnalytics = fr.analytics?.insights && fr.analytics.insights.length > 0;
      return responseCount >= MIN_REVIEWS_REQUIRED && hasAnalytics;
    });

  const employeesWithAnalytics = new Set(
    employeesWithSufficientData.map(fr => fr.employee_id)
  );

  // Get total number of employees
  const totalEmployees = new Set(
    feedbackRequests.map(fr => fr.employee_id)
  ).size;

  // Only proceed if we have at least one employee with sufficient data
  if (employeesWithAnalytics.size === 0) return null;

  // First aggregate per employee
  const employeeCompetencies = new Map<string, Map<string, Array<{
    score: number;
    confidence: 'low' | 'medium' | 'high';
    evidenceCount: number;
    relationship: string;
  }>>>();

  feedbackRequests.forEach(request => {
    if (!request.analytics?.insights) return;

    // Find aggregate insights for this employee
    const aggregateInsight = request.analytics.insights.find(insight => 
      insight.relationship === 'aggregate'
    );
    if (!aggregateInsight?.competencies) return;

    // Create employee map if it doesn't exist
    const employeeId = request.employee_id;
    if (!employeeCompetencies.has(employeeId)) {
      employeeCompetencies.set(employeeId, new Map());
    }

    // Add competency scores for this employee
    aggregateInsight.competencies.forEach(comp => {
      const employeeMap = employeeCompetencies.get(employeeId)!;
      if (!employeeMap.has(comp.name)) {
        employeeMap.set(comp.name, []);
      }
      employeeMap.get(comp.name)!.push({
        score: comp.score,
        confidence: comp.confidence,
        evidenceCount: comp.evidenceCount,
        relationship: aggregateInsight.relationship
      });
    });
  });

  // Now calculate averages and confidence per competency
  const competencyScores = new Map<string, Array<ScoreWithOutlier>>();

  // Aggregate scores per competency across employees
  employeeCompetencies.forEach((employeeMap) => {
    employeeMap.forEach((scores, competencyName) => {
      if (!competencyScores.has(competencyName)) {
        competencyScores.set(competencyName, []);
      }
      
      // Apply outlier detection
      const adjustedScores = detectOutliers(scores);
      
      // Calculate weighted average score with outlier and confidence adjustments only
      // Note: Relationship weights are already applied in individual employee aggregation
      const weightedScores = adjustedScores.map(s => ({
        ...s,
        weightedScore: s.score * 
          (s.adjustedWeight || 1) * // Outlier adjustment if any, otherwise keep original score
          CONFIDENCE_WEIGHTS[s.confidence]
      }));
      
      const totalWeight = weightedScores.reduce((sum, s) => 
        sum + ((s.adjustedWeight || 1) * CONFIDENCE_WEIGHTS[s.confidence]), 0);
      
      const avgScore = weightedScores.reduce((sum, s) => sum + s.weightedScore, 0) / totalWeight;
      
      competencyScores.get(competencyName)!.push({
        score: avgScore,
        confidence: calculateConfidence(scores),
        evidenceCount: scores.reduce((sum, s) => sum + s.evidenceCount, 0),
        relationship: scores[0].relationship,
        hasOutliers: adjustedScores.some(s => s.adjustedWeight !== 1) // Changed from RELATIONSHIP_WEIGHTS check
      });
    });
  });

  // Calculate final scores and sort
  const sortedScores = Array.from(competencyScores.entries()).map(([name, scores]) => {
    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    const confidence = calculateConfidence(scores);
    const hasOutliers = scores.some(s => s.hasOutliers);
    const adjustmentDetails = scores.flatMap(s => s.adjustmentDetails || []);

    return {
      name,
      score: avgScore,
      confidence,
      description: CORE_COMPETENCIES[name]?.aspects?.join(' • ') || '',
      evidenceCount: scores.reduce((sum, s) => sum + s.evidenceCount, 0),
      hasOutliers,
      adjustmentDetails: adjustmentDetails.length > 0 ? adjustmentDetails : undefined
    };
  }).sort((a, b) => b.score - a.score);

  if (sortedScores.length === 0) return null;

  // Update chartData to use full names and maintain order
  const chartData = COMPETENCY_ORDER
    .map(name => {
      const score = sortedScores.find(s => s.name === name);
      if (!score) return null;
      return {
        subject: name.split(' ')[0],
        fullName: name,
        value: score.score,
        confidence: score.confidence,
        evidenceCount: score.evidenceCount
      };
    })
    .filter((item): item is ChartDataPoint => item !== null);

  const employeeText = employeesWithAnalytics.size === 1 
    ? "1 employee" 
    : `${employeesWithAnalytics.size} employees`;

  // Calculate total reviews for included employees
  const includedReviewCount = employeesWithSufficientData
    .reduce((sum, fr) => sum + (fr.feedback_responses?.length || 0), 0);

  // Calculate total reviews across all employees
  const totalReviewCount = feedbackRequests
    .reduce((sum, fr) => sum + (fr.feedback_responses?.length || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Team Competency Analysis</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-xs font-normal bg-background">
                    Beta
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[300px]">
                  <p className="text-sm">
                    This feature is in beta. We're actively improving our analysis methodology and visualization. Your feedback helps us enhance the accuracy and usefulness of these insights.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground">
            Based on {employeesWithAnalytics.size} of {totalEmployees} employees ({includedReviewCount} of {totalReviewCount} reviews)
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <InfoIcon className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[400px] p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Team Competency Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    A comprehensive view of your team's strengths and areas for growth, based on AI-analyzed feedback from peers, managers, and direct reports.
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-1">How to read this:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-100 border border-blue-500 mt-0.5 shrink-0" />
                      <span>The blue area shows overall performance - a larger shape means stronger performance across competencies</span>
                    </li>
                    <li className="flex gap-2">
                      <div className="w-4 h-4 flex items-center justify-center shrink-0">5</div>
                      <span>Each axis shows a competency score from 0-5, with grid lines marking each point</span>
                    </li>
                    <li className="flex gap-2">
                      <div className="w-4 h-4 bg-blue-50 text-blue-700 text-xs flex items-center justify-center rounded shrink-0">high</div>
                      <div>
                        <span>Confidence levels reflect:</span>
                        <ul className="mt-1 space-y-1 list-disc pl-4">
                          <li>Number of reviews</li>
                          <li>Evidence quality and consistency</li>
                          <li>Diversity of feedback sources</li>
                        </ul>
                      </div>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-1">Methodology:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-4">
                    <li>Scores weighted by relationship (senior 40%, peer 35%, junior 25%)</li>
                    <li>Statistical outliers adjusted to maintain balance</li>
                    <li>Minimum 5 reviews per employee for inclusion</li>
                    <li>Confidence based on evidence count, score consistency, and feedback diversity</li>
                  </ul>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid gap-4 grid-cols-3">
            <div className="p-4 border rounded-lg bg-slate-50">
              <div className="text-sm font-medium text-muted-foreground mb-1">Team Coverage</div>
              <div className="text-2xl font-semibold">{employeesWithAnalytics.size}/{totalEmployees}</div>
              <div className="text-sm text-muted-foreground">employees analyzed</div>
            </div>
            <div className="p-4 border rounded-lg bg-slate-50">
              <div className="text-sm font-medium text-muted-foreground mb-1">Total Reviews</div>
              <div className="text-2xl font-semibold">{includedReviewCount}/{totalReviewCount}</div>
              <div className="text-sm text-muted-foreground">reviews processed</div>
            </div>
            <div className="p-4 border rounded-lg bg-slate-50">
              <div className="text-sm font-medium text-muted-foreground mb-1">Average Evidence</div>
              <div className="text-2xl font-semibold">
                {(sortedScores.reduce((sum, s) => sum + s.evidenceCount, 0) / sortedScores.length).toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">pieces per competency</div>
            </div>
          </div>

          {/* Detailed Scores */}
          <div className="border rounded-lg">
            <div className="p-3 border-b bg-slate-50">
              <h3 className="text-sm font-medium">Team Competency Analysis</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Click on any competency to see detailed analysis
              </p>
            </div>
            <div className="divide-y">
              {COMPETENCY_ORDER.map((name) => {
                const score = sortedScores.find(s => s.name === name);
                if (!score) return null;
                const isExpanded = expandedCompetency === name;
                
                return (
                  <div 
                    key={name} 
                    className={cn(
                      "p-4 transition-colors",
                      "cursor-pointer hover:bg-slate-50",
                      isExpanded && "bg-slate-50"
                    )}
                    onClick={() => setExpandedCompetency(isExpanded ? null : name)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{score.name}</h4>
                          <Badge 
                            variant={score.confidence === 'low' ? 'destructive' : 
                                   score.confidence === 'medium' ? 'outline' : 
                                   'secondary'}
                            className={cn(
                              "text-xs capitalize",
                              score.confidence === 'medium' && "bg-yellow-50 text-yellow-700",
                              score.confidence === 'high' && "bg-green-50 text-green-700"
                            )}
                          >
                            {score.confidence}
                          </Badge>
                          {score.hasOutliers && (
                            <Badge variant="outline" className="text-xs">
                              Adjusted for outliers
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{score.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-semibold">{score.score.toFixed(1)}/5.0</div>
                        <div className="text-sm text-muted-foreground">
                          {score.evidenceCount} pieces of evidence
                        </div>
                      </div>
                    </div>
                    <div className="relative mt-2">
                      <Progress 
                        value={(score.score / 5) * 100} 
                        className={cn(
                          "h-2",
                          score.confidence === 'low' ? "bg-destructive/10 [&>div]:bg-destructive/50" :
                          score.confidence === 'medium' ? "bg-yellow-100 [&>div]:bg-yellow-500" :
                          "bg-primary/10 [&>div]:bg-primary"
                        )}
                      />
                      <div className="absolute inset-0 grid grid-cols-5 -mx-[1px]">
                        {[1,2,3,4,5].map(n => (
                          <div key={n} className="border-l border-muted last:border-r" />
                        ))}
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="space-y-4">
                          {/* Description Section */}
                          <div>
                            <h5 className="text-sm font-medium mb-2">About this Competency</h5>
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {CORE_COMPETENCIES[score.name]?.aspects?.map((aspect, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {aspect}
                                  </Badge>
                                ))}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {CORE_COMPETENCIES[score.name]?.rubric[Math.round(score.score)] || 
                                 "Score description not available"}
                              </div>
                            </div>
                          </div>

                          {/* Score Breakdown */}
                          <div>
                            <h5 className="text-sm font-medium mb-2">Score Breakdown</h5>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-background rounded border">
                                <div className="text-sm text-muted-foreground">Confidence Level</div>
                                <div className="font-medium capitalize flex items-center gap-2">
                                  {score.confidence}
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <InfoIcon className="h-4 w-4 text-muted-foreground" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-sm">
                                          {score.confidence === 'high' && "Based on consistent feedback across multiple relationships with strong evidence"}
                                          {score.confidence === 'medium' && "Based on moderate evidence with some variation in feedback"}
                                          {score.confidence === 'low' && "Limited evidence or significant variation in feedback"}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </div>
                              <div className="p-3 bg-background rounded border">
                                <div className="text-sm text-muted-foreground">Evidence Count</div>
                                <div className="font-medium flex items-center gap-2">
                                  {score.evidenceCount} pieces
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <InfoIcon className="h-4 w-4 text-muted-foreground" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-sm">
                                          Number of specific examples found in feedback that demonstrate this competency
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Evidence Section */}
                          <div>
                            <h5 className="text-sm font-medium mb-2">Score Adjustments</h5>
                            <div className="space-y-2">
                              {score.hasOutliers ? (
                                <>
                                  {(score.adjustmentDetails || []).map((detail, i) => (
                                    <div key={i} className="p-3 bg-background rounded border">
                                      <div className="flex items-center gap-2 text-sm">
                                        <Badge variant="outline" className="shrink-0">
                                          {detail.adjustmentType === 'extreme' ? 'Major Adjustment' : 'Minor Adjustment'}
                                        </Badge>
                                        <span className="text-muted-foreground">
                                          {detail.relationship} feedback score of {detail.originalScore.toFixed(1)} was adjusted due to statistical variance
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                  <p className="text-sm text-muted-foreground mt-2">
                                    Adjustments help maintain balanced scoring when feedback varies significantly from the average
                                  </p>
                                </>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  No score adjustments were needed - feedback was consistently within expected ranges
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Methodology Note */}
                          <div className="text-sm text-muted-foreground bg-slate-100 p-3 rounded">
                            <p className="font-medium mb-2">How this score is calculated:</p>
                            <ul className="list-disc pl-4 space-y-2">
                              <li>
                                <span className="font-medium">Relationship Weighting:</span>
                                <ul className="mt-1 pl-4">
                                  <li>Senior feedback: 40% weight</li>
                                  <li>Peer feedback: 35% weight</li>
                                  <li>Junior feedback: 25% weight</li>
                                </ul>
                              </li>
                              <li>
                                <span className="font-medium">Statistical Adjustments:</span>
                                {score.hasOutliers ? ' Applied to maintain scoring balance' : ' None needed'}
                              </li>
                              <li>
                                <span className="font-medium">Confidence Assessment:</span> Based on evidence quantity ({score.evidenceCount} pieces) and feedback consistency
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 