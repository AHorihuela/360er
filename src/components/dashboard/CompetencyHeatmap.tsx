import { useState, useMemo } from 'react';
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
import { CORE_COMPETENCIES, COMPETENCY_NAME_TO_KEY } from '@/lib/competencies';
import { cn } from "@/lib/utils";

export function CompetencyHeatmap({ feedbackRequests }: CompetencyHeatmapProps) {
  const [expandedCompetency, setExpandedCompetency] = useState<string | null>(null);

  // Memoize the competency score calculations
  const competencyScores = useMemo(() => {
    const scores = new Map<string, ScoreWithOutlier[]>();

    feedbackRequests.forEach(request => {
      if (!request.analytics?.insights) return;
      console.log('CompetencyHeatmap - request.analytics:', request.analytics);

      request.analytics.insights.forEach(insight => {
        console.log('CompetencyHeatmap - insight:', insight);
        insight.competencies.forEach(comp => {
          console.log('CompetencyHeatmap - comp:', comp);
          if (!scores.has(comp.name)) {
            scores.set(comp.name, []);
          }
          
          const compScores = scores.get(comp.name)!;
          const score: ScoreWithOutlier = {
            name: comp.name,
            score: comp.score,
            confidence: comp.confidence,
            description: comp.description,
            evidenceCount: comp.evidenceCount,
            effectiveEvidenceCount: comp.evidenceCount,
            relationship: insight.relationship,
            evidenceQuotes: comp.evidenceQuotes ?? [],
            hasOutliers: false,
            adjustedWeight: RELATIONSHIP_WEIGHTS[insight.relationship as keyof typeof RELATIONSHIP_WEIGHTS]
          };
          console.log('CompetencyHeatmap - created score:', score);
          compScores.push(score);
        });
      });
    });

    return scores;
  }, [feedbackRequests]);

  // Memoize the processed data
  const {
    employeesWithAnalytics,
    totalEmployees,
    includedReviewCount,
    analyzedReviewCount,
    sortedScores,
    averageConfidence
  } = useMemo(() => {
    // Process feedback data
    const employeesWithAnalytics = new Set(feedbackRequests.filter(r => r.analytics).map(r => r.employee_id));
    const totalEmployees = new Set(feedbackRequests.map(r => r.employee_id)).size;
    const includedReviewCount = feedbackRequests.reduce((sum, r) => sum + (r.feedback_responses?.length ?? 0), 0);
    const analyzedReviewCount = feedbackRequests.filter(r => r.analytics).reduce((sum, r) => sum + (r.feedback_responses?.length ?? 0), 0);

    // Calculate aggregate scores with outlier detection
    const sortedScores: ScoreWithOutlier[] = COMPETENCY_ORDER.map(competencyName => {
      console.log('CompetencyHeatmap - competencyName:', competencyName);
      
      const scores = competencyScores.get(competencyName) || [];
      console.log('CompetencyHeatmap - scores:', scores);
      
      if (scores.length === 0) return null;

      // Detect and adjust outliers - only calculate once per competency
      const adjustedScores = detectOutliers(scores);
      const hasOutliers = adjustedScores.some(s => s.adjustedWeight !== RELATIONSHIP_WEIGHTS[s.relationship as keyof typeof RELATIONSHIP_WEIGHTS]);
      const adjustmentDetails = adjustedScores
        .filter(s => s.adjustmentDetails)
        .flatMap(s => s.adjustmentDetails || []);
      
      // Calculate weighted average score
      const totalWeight = adjustedScores.reduce((sum: number, s: ScoreWithOutlier) => 
        sum + (s.adjustedWeight || RELATIONSHIP_WEIGHTS[s.relationship as keyof typeof RELATIONSHIP_WEIGHTS]), 0);
      
      const weightedScore = Number((adjustedScores.reduce((sum: number, s: ScoreWithOutlier) => 
        sum + (s.score * (s.adjustedWeight || RELATIONSHIP_WEIGHTS[s.relationship as keyof typeof RELATIONSHIP_WEIGHTS])), 0) / totalWeight).toFixed(3));

      // Calculate confidence based on evidence and consistency - only once per competency
      const confidenceResult = calculateConfidence(scores);

      // Calculate relationship breakdown
      const relationshipBreakdown = {
        senior: scores.reduce((sum, s) => sum + (s.relationship === 'senior' ? s.evidenceCount : 0), 0),
        peer: scores.reduce((sum, s) => sum + (s.relationship === 'peer' ? s.evidenceCount : 0), 0),
        junior: scores.reduce((sum, s) => sum + (s.relationship === 'junior' ? s.evidenceCount : 0), 0)
      };

      // Calculate score distribution
      const scoreDistribution = scores.reduce((dist, s) => {
        const roundedScore = Math.round(s.score);
        dist[roundedScore] = (dist[roundedScore] || 0) + 1;
        return dist;
      }, {} as Record<number, number>);

      // Calculate average score and standard deviation
      const allScores = scores.map(s => s.score);
      const averageScore = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
      const variance = allScores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / allScores.length;
      const standardDeviation = Math.sqrt(variance);

      // Combine evidence quotes from all scores
      const evidenceQuotes = Array.from(new Set(scores.flatMap(s => s.evidenceQuotes ?? [])));
      console.log('CompetencyHeatmap - evidenceQuotes:', evidenceQuotes);

      return {
        name: competencyName,
        score: weightedScore,
        confidence: confidenceResult.level,
        evidenceCount: scores.reduce((sum, s) => sum + s.evidenceCount, 0),
        effectiveEvidenceCount: confidenceResult.metrics.factors.evidenceCount,
        relationship: 'aggregate',
        hasOutliers,
        adjustmentDetails: adjustmentDetails.length > 0 ? adjustmentDetails : undefined,
        description: CORE_COMPETENCIES[COMPETENCY_NAME_TO_KEY[competencyName]]?.aspects?.join(' • ') || '',
        confidenceMetrics: confidenceResult.metrics,
        relationshipBreakdown,
        scoreDistribution,
        averageScore,
        scoreSpread: standardDeviation,
        evidenceQuotes
      } as ScoreWithOutlier;
    }).filter((score): score is ScoreWithOutlier => score !== null);

    // Calculate confidence metrics
    const averageConfidence = sortedScores.reduce((sum, s) => {
      const weight = CONFIDENCE_WEIGHTS[s.confidence];
      return sum + weight;
    }, 0) / sortedScores.length;

    return {
      employeesWithAnalytics: employeesWithAnalytics.size,
      totalEmployees,
      includedReviewCount,
      analyzedReviewCount,
      sortedScores,
      averageConfidence
    };
  }, [competencyScores]);

  if (sortedScores.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Team Competency Analysis</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="default" className="text-xs font-normal bg-black text-white hover:bg-black">
                    Beta
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[300px]">
                  <p className="text-sm">
                    AI-powered analysis of your team's competencies based on feedback responses. This feature is in beta as we continue to refine our analysis methods.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Based on {analyzedReviewCount} of {includedReviewCount} completed reviews
            </p>
          </div>
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
                    <li>Minimum {MIN_REVIEWS_REQUIRED} reviews per employee for inclusion</li>
                    <li>Confidence based on evidence count, score consistency, and feedback diversity</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Color Scheme:</h4>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      Green (≥4.0): Significantly exceeding expectations
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                      Blue (≥3.5): Exceeding expectations
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                      Yellow (≥3.0): Meeting expectations
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                      Orange (≥2.5): Approaching expectations
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                      Red (&lt;2.5): Needs improvement
                    </li>
                  </ul>
                  <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-500"></div>
                      100% opacity: High
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-500 opacity-70"></div>
                      70%: Medium
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-500 opacity-40"></div>
                      40%: Low
                    </div>
                  </div>
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
            employeesWithAnalytics={employeesWithAnalytics}
            totalEmployees={totalEmployees}
            includedReviewCount={includedReviewCount}
            totalReviewCount={analyzedReviewCount}
            averageEvidenceCount={sortedScores.reduce((sum, s) => sum + s.evidenceCount, 0) / sortedScores.length}
            averageConfidence={averageConfidence}
            evidenceCountByCompetency={{}}
            sortedScores={sortedScores}
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
                      "p-4 transition-colors duration-200",
                      isExpanded && "bg-slate-50"
                    )}
                  >
                    <CompetencySummaryCard
                      score={score}
                      isExpanded={isExpanded}
                      onToggle={() => setExpandedCompetency(isExpanded ? null : name)}
                    />
                    
                    {isExpanded && (
                      <CompetencyDetails 
                        score={score}
                        feedbackRequests={feedbackRequests}
                      />
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