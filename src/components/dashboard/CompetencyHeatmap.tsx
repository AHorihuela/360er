import React from 'react';
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

export function CompetencyHeatmap({ feedbackRequests }: CompetencyHeatmapProps) {
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
      
      // Calculate weighted average score with outlier adjustment
      const weightedScores = adjustedScores.map(s => ({
        ...s,
        weightedScore: s.score * 
          (s.adjustedWeight || RELATIONSHIP_WEIGHTS[s.relationship as keyof typeof RELATIONSHIP_WEIGHTS] || 1) *
          CONFIDENCE_WEIGHTS[s.confidence]
      }));
      
      const totalWeight = weightedScores.reduce((sum, s) => 
        sum + (
          (s.adjustedWeight || RELATIONSHIP_WEIGHTS[s.relationship as keyof typeof RELATIONSHIP_WEIGHTS] || 1) *
          CONFIDENCE_WEIGHTS[s.confidence]
        ), 0);
      
      const avgScore = weightedScores.reduce((sum, s) => sum + s.weightedScore, 0) / totalWeight;
      
      competencyScores.get(competencyName)!.push({
        score: avgScore,
        confidence: calculateConfidence(scores),
        evidenceCount: scores.reduce((sum, s) => sum + s.evidenceCount, 0),
        relationship: scores[0].relationship,
        hasOutliers: adjustedScores.some(s => s.adjustedWeight !== RELATIONSHIP_WEIGHTS[s.relationship as keyof typeof RELATIONSHIP_WEIGHTS])
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base">Team Competency Analysis</CardTitle>
          <p className="text-sm text-muted-foreground">
            Based on {employeesWithAnalytics.size} of {totalEmployees} employees
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <InfoIcon className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-xs p-4">
                <p className="text-sm font-medium">Team Competency Analysis</p>
                <p className="text-sm text-muted-foreground mt-1">
                  A comprehensive view of your team's strengths and areas for growth, based on aggregated feedback.
                </p>

                <p className="text-sm font-medium mt-4">How to read this:</p>
                <div className="mt-2 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 mt-1 rounded-full bg-blue-500/20 flex-shrink-0 border border-blue-500"/>
                    <p className="text-sm text-muted-foreground">The blue area shows overall performance - a larger shape means stronger performance across competencies</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 mt-1 flex-shrink-0 font-mono text-center text-xs border rounded">5</div>
                    <p className="text-sm text-muted-foreground">Each axis shows a competency score from 0-5, with grid lines marking each point</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-4 mt-1 flex-shrink-0 px-1.5 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">high</div>
                    <p className="text-sm text-muted-foreground">Confidence badges indicate data reliability based on review count, consistency, and diversity</p>
                  </div>
                </div>

                <div className="border-t mt-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Note:</span> For reliable insights, each employee needs at least {MIN_REVIEWS_REQUIRED} reviews to be included.
                  </p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent>
        <div className="grid gap-8 md:grid-cols-2">
          <CompetencyRadarChart chartData={chartData} />
          <div className="space-y-4 bg-white shadow-sm rounded-lg border">
            <div className="p-3 border-b">
              <h3 className="text-sm font-medium">Detailed Scores</h3>
            </div>
            <div className="divide-y">
              {COMPETENCY_ORDER.map((name) => {
                const score = sortedScores.find(s => s.name === name);
                if (!score) return null;
                return <CompetencyScoreCard key={name} score={score} />;
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 