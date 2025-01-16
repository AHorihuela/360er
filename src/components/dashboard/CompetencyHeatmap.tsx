import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoIcon } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { CompetencyHeatmapProps, ScoreWithOutlier } from './types';
import { MIN_REVIEWS_REQUIRED, RELATIONSHIP_WEIGHTS, CONFIDENCE_WEIGHTS, COMPETENCY_ORDER } from './constants';
import { detectOutliers, calculateConfidence } from './utils';
import { CompetencySummaryCard } from './CompetencySummaryCard';
import { CompetencyDetails } from './CompetencyDetails';
import { TeamSummaryStats } from './TeamSummaryStats';
import { CORE_COMPETENCIES } from '@/lib/competencies';
import { cn } from "@/lib/utils";

export function CompetencyHeatmap({ feedbackRequests }: CompetencyHeatmapProps) {
  const [expandedCompetency, setExpandedCompetency] = useState<string | null>(null);

  // Process feedback data
  const employeesWithAnalytics = new Set(feedbackRequests.filter(r => r.analytics).map(r => r.employee_id));
  const totalEmployees = new Set(feedbackRequests.map(r => r.employee_id)).size;
  const includedReviewCount = feedbackRequests.filter(r => r.analytics).length;
  const totalReviewCount = feedbackRequests.length;

  // Calculate scores for each competency
  const competencyScores = new Map<string, ScoreWithOutlier[]>();
  
  feedbackRequests.forEach(request => {
    if (!request.analytics?.insights) return;
    
    request.analytics.insights.forEach(insight => {
      insight.competencies.forEach(comp => {
        if (!competencyScores.has(comp.name)) {
          competencyScores.set(comp.name, []);
        }
        
        const scores = competencyScores.get(comp.name)!;
        scores.push({
          name: comp.name,
          score: comp.score,
          confidence: comp.confidence,
          evidenceCount: comp.evidenceCount,
          relationship: insight.relationship,
          description: comp.description
        });
      });
    });
  });

  // Calculate aggregate scores with outlier detection
  const sortedScores: ScoreWithOutlier[] = COMPETENCY_ORDER.map(competencyName => {
    const scores = competencyScores.get(competencyName) || [];
    if (scores.length === 0) return null;

    // Detect and adjust outliers
    const adjustedScores = detectOutliers(scores);
    const hasOutliers = adjustedScores.some(s => s.adjustedWeight !== RELATIONSHIP_WEIGHTS[s.relationship as keyof typeof RELATIONSHIP_WEIGHTS]);
    const adjustmentDetails = adjustedScores
      .filter(s => s.adjustmentDetails)
      .flatMap(s => s.adjustmentDetails || []);
    
    // Calculate weighted average score
    const totalWeight = adjustedScores.reduce((sum: number, s: ScoreWithOutlier) => 
      sum + (s.adjustedWeight || RELATIONSHIP_WEIGHTS[s.relationship as keyof typeof RELATIONSHIP_WEIGHTS]), 0);
    
    const weightedScore = adjustedScores.reduce((sum: number, s: ScoreWithOutlier) => 
      sum + (s.score * (s.adjustedWeight || RELATIONSHIP_WEIGHTS[s.relationship as keyof typeof RELATIONSHIP_WEIGHTS])), 0) / totalWeight;

    // Calculate confidence based on evidence and consistency
    const confidence = calculateConfidence(scores);

    return {
      name: competencyName,
      score: weightedScore,
      confidence,
      evidenceCount: scores.reduce((sum, s) => sum + s.evidenceCount, 0),
      relationship: 'aggregate',
      hasOutliers,
      adjustmentDetails: adjustmentDetails.length > 0 ? adjustmentDetails : undefined,
      description: CORE_COMPETENCIES[competencyName]?.aspects?.join(' • ') || ''
    } as ScoreWithOutlier;
  }).filter((score): score is ScoreWithOutlier => score !== null);

  if (sortedScores.length === 0) return null;

  const employeeText = employeesWithAnalytics.size === 1 
    ? "1 employee" 
    : `${employeesWithAnalytics.size} employees`;

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
          <TeamSummaryStats
            employeesWithAnalytics={employeesWithAnalytics.size}
            totalEmployees={totalEmployees}
            includedReviewCount={includedReviewCount}
            totalReviewCount={totalReviewCount}
            averageEvidenceCount={sortedScores.reduce((sum, s) => sum + s.evidenceCount, 0) / sortedScores.length}
          />

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
                      "p-4",
                      isExpanded && "bg-slate-50"
                    )}
                  >
                    <CompetencySummaryCard
                      score={score}
                      isExpanded={isExpanded}
                      onToggle={() => setExpandedCompetency(isExpanded ? null : name)}
                    />
                    
                    {isExpanded && (
                      <CompetencyDetails score={score} />
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