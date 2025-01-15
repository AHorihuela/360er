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
}

const MIN_REVIEWS_REQUIRED = 5;

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
  const competencyScores = validAnalytics.reduce((acc: { [key: string]: AggregateScore[] }, insight) => {
    if (!insight.competencies) return acc;
    
    insight.competencies.forEach(comp => {
      if (!acc[comp.name]) acc[comp.name] = [];
      acc[comp.name].push({
        name: comp.name,
        score: comp.score,
        confidence: comp.confidence,
        description: comp.description,
        evidenceCount: comp.evidenceCount
      });
    });
    return acc;
  }, {});

  // Calculate average scores and sort by score
  const sortedScores = Object.entries(competencyScores).map(([name, scores]) => {
    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    const avgConfidence = scores.reduce((sum, s) => {
      const confidenceValue = { low: 1, medium: 2, high: 3 }[s.confidence];
      return sum + confidenceValue;
    }, 0) / scores.length;
    
    return {
      name,
      score: avgScore,
      confidence: avgConfidence >= 2.5 ? 'high' : avgConfidence >= 1.5 ? 'medium' : 'low',
      description: scores[0].description,
      evidenceCount: scores.reduce((sum, s) => sum + s.evidenceCount, 0)
    };
  }).sort((a, b) => b.score - a.score);

  if (sortedScores.length === 0) return null;

  // Format data for radar chart
  const chartData = sortedScores.map(score => ({
    subject: score.name.split(' ')[0], // Use first word for cleaner display
    score: score.score,
    fullMark: 5,
    fullName: score.name,
    description: score.description,
    evidenceCount: score.evidenceCount
  }));

  const employeeText = employeesWithAnalytics.size === 1 
    ? "1 employee" 
    : `${employeesWithAnalytics.size} employees`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Team Competency Analysis</CardTitle>
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
        <p className="text-sm text-muted-foreground mb-2">
          Based on {employeeText} with {MIN_REVIEWS_REQUIRED}+ reviews
          {totalEmployees > 1 && ` (out of ${totalEmployees} total)`}
        </p>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 5]}
                tick={{ fill: '#6b7280', fontSize: 10 }}
              />
              <Radar
                name="Team Score"
                dataKey="score"
                stroke="#2563eb"
                fill="#3b82f6"
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {sortedScores.map((score) => (
            <TooltipProvider key={score.name}>
              <Tooltip>
                <TooltipTrigger className="w-full">
                  <div className={cn(
                    "p-2 rounded-md border text-left text-sm",
                    "hover:bg-slate-50 transition-colors"
                  )}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium truncate">{score.name}</span>
                      <span className="text-muted-foreground ml-2">{score.score.toFixed(1)}</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs space-y-2">
                    <p className="font-medium">{score.name}</p>
                    <p className="text-sm">{score.description}</p>
                    <div className="text-xs text-muted-foreground">
                      Based on {score.evidenceCount} pieces of evidence
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 