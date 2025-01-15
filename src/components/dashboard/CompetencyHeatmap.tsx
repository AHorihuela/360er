import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoIcon } from 'lucide-react';
import { DashboardFeedbackRequest } from '@/types/feedback/dashboard';
import { CORE_COMPETENCIES } from '@/lib/competencies';
import { cn } from '@/lib/utils';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer 
} from 'recharts';

interface CompetencyHeatmapProps {
  feedbackRequests: DashboardFeedbackRequest[];
}

interface AggregateScore {
  name: string;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  description: string;
  evidenceCount: number;
  reviewerId: string;
  relationship: string;
}

const MIN_REVIEWS_REQUIRED = 5;

// Add this constant for consistent ordering
const COMPETENCY_ORDER = [
  'Technical/Functional Expertise',
  'Leadership & Influence',
  'Collaboration & Communication',
  'Innovation & Problem-Solving',
  'Execution & Accountability',
  'Emotional Intelligence & Culture Fit',
  'Growth & Development'
];

interface ConfidenceMetrics {
  evidenceCount: number;
  scoreVariance: number;
  relationshipTypes: number;
}

function calculateConfidence({
  evidenceCount,
  scoreVariance,
  relationshipTypes,
  mentionCount
}: ConfidenceMetrics & { mentionCount: number }): 'low' | 'medium' | 'high' {
  // Thresholds based on number of reviews that mention this competency
  const MIN_MENTIONS = 5;        // At least 5 reviews should mention this
  const MAX_VARIANCE = 1.2;      // Score variance should be low
  const MIN_RELATIONSHIPS = 3;    // From at least 3 different relationship types

  // High confidence requires all criteria
  if (
    mentionCount >= MIN_MENTIONS &&
    scoreVariance <= MAX_VARIANCE &&
    relationshipTypes >= MIN_RELATIONSHIPS
  ) {
    return 'high';
  }

  // Low confidence if we don't meet base requirements
  if (
    mentionCount < MIN_MENTIONS / 2 ||    // Less than 3 reviews mention this
    scoreVariance > MAX_VARIANCE * 1.5 ||  // High variance in scores
    relationshipTypes < 2                  // Only 1 relationship type
  ) {
    return 'low';
  }

  // Medium confidence for everything else
  return 'medium';
}

function calculateScoreVariance(scores: number[]): number {
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length);
}

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

  // Only use analytics from employees with sufficient data
  const validAnalytics = employeesWithSufficientData
    .map(fr => fr.analytics!.insights)
    .flat();

  // Aggregate scores for each competency
  const competencyScores = validAnalytics.reduce((acc: { [key: string]: Array<{
    name: string;
    score: number;
    confidence: 'low' | 'medium' | 'high';
    description: string;
    evidenceCount: number;
    relationship: string;
  }> }, insight) => {
    if (!insight.competencies) return acc;
    
    insight.competencies.forEach(comp => {
      if (!acc[comp.name]) acc[comp.name] = [];
      acc[comp.name].push({
        name: comp.name,
        score: comp.score,
        confidence: comp.confidence,
        description: comp.description,
        evidenceCount: comp.evidenceCount,
        relationship: insight.relationship || 'unknown'
      });
    });
    return acc;
  }, {});

  // Calculate average scores and sort by score
  const sortedScores = Object.entries(competencyScores).map(([name, scores]) => {
    const scoreValues = scores.map(s => s.score);
    const uniqueRelationships = new Set(scores.map(s => s.relationship)).size;
    
    // Count how many reviews mention this competency
    const mentionCount = scores.length;
    
    const confidenceMetrics: ConfidenceMetrics & { mentionCount: number } = {
      evidenceCount: scores.length, // Number of times this competency was mentioned
      scoreVariance: calculateScoreVariance(scoreValues),
      relationshipTypes: uniqueRelationships,
      mentionCount
    };

    const confidence = calculateConfidence(confidenceMetrics);
    const avgScore = scoreValues.reduce((sum, score) => sum + score, 0) / scores.length;

    return {
      name,
      score: avgScore,
      confidence,
      confidenceMetrics,
      description: scores[0].description,
      evidenceCount: scores.length // Use number of mentions instead of summing evidence
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
    .filter(Boolean);

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
              <p className="max-w-xs text-sm">
                Radar chart showing team competency scores. Larger area indicates stronger performance.
                Each employee needs at least {MIN_REVIEWS_REQUIRED} reviews to be included in the analysis.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent>
        <div className="grid gap-8 md:grid-cols-2">
          {/* Radar Chart */}
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart 
                cx="50%" 
                cy="50%" 
                outerRadius="65%" 
                data={chartData}
                startAngle={90}
                endAngle={-270}
              >
                <PolarGrid 
                  stroke="#e5e7eb" 
                  strokeOpacity={0.3}
                  gridType="polygon"
                />
                {/* Add background circles */}
                {[1, 2, 3, 4, 5].map((value) => (
                  <PolarGrid
                    key={value}
                    stroke="none"
                    gridType="circle"
                    radius={value * 20}
                    fill={value % 2 ? "#f8fafc" : "#ffffff"}
                    fillOpacity={0.5}
                  />
                ))}
                <PolarAngleAxis
                  dataKey="subject"
                  tick={({ x, y, payload }) => (
                    <g transform={`translate(${x},${y})`}>
                      <text
                        x={0}
                        y={0}
                        dy={-4}
                        textAnchor="middle"
                        fill="#6b7280"
                        fontSize={11}
                      >
                        {payload.value}
                      </text>
                    </g>
                  )}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 5]}
                  axisLine={false}
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  stroke="#e5e7eb"
                  strokeOpacity={0.3}
                />
                <Radar
                  name="Team Score"
                  dataKey="value"
                  stroke="#2563eb"
                  fill="#3b82f6"
                  fillOpacity={0.7}
                  dot
                  isAnimationActive={false}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Competency Scores */}
          <div className="space-y-4 bg-white shadow-sm rounded-lg border">
            <div className="p-3 border-b">
              <h3 className="text-sm font-medium">Detailed Scores</h3>
            </div>
            <div className="divide-y">
              {COMPETENCY_ORDER.map((name) => {
                const score = sortedScores.find(s => s.name === name);
                if (!score) return null;
                return (
                  <TooltipProvider key={score.name}>
                    <Tooltip>
                      <TooltipTrigger className="w-full p-3 hover:bg-slate-50 transition-colors">
                        <div className="space-y-2 text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{score.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{score.score.toFixed(1)}/5</span>
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full font-medium",
                                score.confidence === 'high' && "bg-blue-100 text-blue-700",
                                score.confidence === 'medium' && "bg-yellow-100 text-yellow-700",
                                score.confidence === 'low' && "bg-red-100 text-red-700"
                              )}>
                                {score.confidence}
                              </span>
                            </div>
                          </div>
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div 
                              className={cn(
                                "h-full transition-all",
                                score.confidence === 'high' && "bg-blue-500",
                                score.confidence === 'medium' && "bg-yellow-500",
                                score.confidence === 'low' && "bg-red-500"
                              )}
                              style={{ width: `${(score.score / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="p-4">
                        <div className="max-w-xs space-y-3">
                          {/* Header with name and confidence badge */}
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">{score.name}</h3>
                            <span className={cn(
                              "text-xs px-2 py-1 rounded-full font-medium",
                              score.confidence === 'high' && "bg-blue-100 text-blue-700",
                              score.confidence === 'medium' && "bg-yellow-100 text-yellow-700",
                              score.confidence === 'low' && "bg-red-100 text-red-700"
                            )}>
                              {score.confidence} confidence
                            </span>
                          </div>

                          {/* Confidence metrics section */}
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-muted-foreground">Why this confidence level?</h4>
                            <ul className="space-y-2">
                              <li className="flex items-center gap-2 text-sm">
                                <span className={cn(
                                  "w-2 h-2 rounded-full shrink-0",
                                  score.confidenceMetrics.mentionCount >= 5 ? "bg-green-500" : "bg-red-500"
                                )}/>
                                <span className="text-muted-foreground">
                                  Mentioned in {score.confidenceMetrics.mentionCount} reviews
                                  {score.confidenceMetrics.mentionCount >= 5 ? " ✓" : ` (needs ${5 - score.confidenceMetrics.mentionCount} more)`}
                                </span>
                              </li>
                              <li className="flex items-center gap-2 text-sm">
                                <span className={cn(
                                  "w-2 h-2 rounded-full shrink-0",
                                  score.confidenceMetrics.scoreVariance <= 1.2 ? "bg-green-500" : "bg-red-500"
                                )}/>
                                <span className="text-muted-foreground">
                                  Score consistency: {score.confidenceMetrics.scoreVariance.toFixed(1)}
                                  {score.confidenceMetrics.scoreVariance <= 1.2 ? " ✓" : " (too varied)"}
                                </span>
                              </li>
                              <li className="flex items-center gap-2 text-sm">
                                <span className={cn(
                                  "w-2 h-2 rounded-full shrink-0",
                                  score.confidenceMetrics.relationshipTypes >= 3 ? "bg-green-500" : "bg-red-500"
                                )}/>
                                <span className="text-muted-foreground">
                                  {score.confidenceMetrics.relationshipTypes} relationship types
                                  {score.confidenceMetrics.relationshipTypes >= 3 ? " ✓" : ` (needs ${3 - score.confidenceMetrics.relationshipTypes} more)`}
                                </span>
                              </li>
                            </ul>
                          </div>

                          {/* Score consistency explanation */}
                          <div className="pt-3 border-t">
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">About Score Consistency:</span><br />
                              A score of {score.confidenceMetrics.scoreVariance.toFixed(1)} means reviewers 
                              {score.confidenceMetrics.scoreVariance <= 1.2 
                                ? " generally agree in their ratings" 
                                : " have varying opinions"}. Lower is better.
                            </p>
                          </div>

                          {/* Key aspects section */}
                          {Object.values(CORE_COMPETENCIES).find(comp => comp.name === score.name) && (
                            <div className="pt-3 border-t space-y-2">
                              <h4 className="text-sm font-semibold text-muted-foreground">Key Aspects:</h4>
                              <ul className="space-y-1">
                                {Object.values(CORE_COMPETENCIES)
                                  .find(comp => comp.name === score.name)?.aspects
                                  .map((aspect, i) => (
                                    <li key={i} className="text-sm text-muted-foreground">• {aspect}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 