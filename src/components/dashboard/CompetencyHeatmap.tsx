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
          <CardTitle className="text-base">Team Competency Analysis</CardTitle>
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