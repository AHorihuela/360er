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

interface AdjustmentDetail {
  originalScore: number;
  adjustmentType: 'extreme' | 'moderate';
  relationship: string;
}

interface ScoreWithOutlier {
  score: number;
  confidence: 'low' | 'medium' | 'high';
  evidenceCount: number;
  relationship: string;
  adjustedWeight?: number;
  hasOutliers?: boolean;
  adjustmentDetails?: AdjustmentDetail[];
}

interface AggregateScore {
  name: string;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  description: string;
  evidenceCount: number;
  hasOutliers?: boolean;
  adjustmentDetails?: AdjustmentDetail[];
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

// Add relationship weight constants at the top level
const RELATIONSHIP_WEIGHTS = {
  senior: 0.4,
  peer: 0.35,
  junior: 0.25,
  aggregate: 1 // Used for already aggregated scores
};

// Add confidence weight constants
const CONFIDENCE_WEIGHTS = {
  low: 0.5,
  medium: 0.8,
  high: 1.0
} as const;

// Add outlier detection constants
const OUTLIER_THRESHOLDS = {
  minZScore: -2,    // Scores more than 2 standard deviations below mean
  maxZScore: 2,     // Scores more than 2 standard deviations above mean
  varianceThreshold: 1.5,  // Maximum acceptable variance
  // Add graduated reduction factors
  maxReduction: 0.5,      // Maximum 50% reduction for extreme outliers (>3 std dev)
  moderateReduction: 0.75 // 25% reduction for moderate outliers (2-3 std dev)
} as const;

// Add outlier detection function
function detectOutliers(scores: ScoreWithOutlier[]): ScoreWithOutlier[] {
  if (scores.length < 3) return scores;

  const values = scores.map(s => s.score);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (variance <= OUTLIER_THRESHOLDS.varianceThreshold) return scores;

  return scores.map(score => {
    const zScore = (score.score - mean) / stdDev;
    const baseWeight = RELATIONSHIP_WEIGHTS[score.relationship as keyof typeof RELATIONSHIP_WEIGHTS] || 1;
    
    if (Math.abs(zScore) > 3) {
      const adjustmentDetail: AdjustmentDetail = {
        originalScore: score.score,
        adjustmentType: 'extreme',
        relationship: score.relationship
      };
      return {
        ...score,
        adjustedWeight: baseWeight * OUTLIER_THRESHOLDS.maxReduction,
        adjustmentDetails: [adjustmentDetail]
      };
    } else if (Math.abs(zScore) > OUTLIER_THRESHOLDS.maxZScore) {
      const adjustmentDetail: AdjustmentDetail = {
        originalScore: score.score,
        adjustmentType: 'moderate',
        relationship: score.relationship
      };
      return {
        ...score,
        adjustedWeight: baseWeight * OUTLIER_THRESHOLDS.moderateReduction,
        adjustmentDetails: [adjustmentDetail]
      };
    }
    
    return {
      ...score,
      adjustedWeight: baseWeight
    };
  });
}

// Update calculateConfidence to return a weighted confidence score
function calculateConfidence(scores: Array<{
  score: number;
  confidence: 'low' | 'medium' | 'high';
  evidenceCount: number;
  relationship: string;
}>): 'low' | 'medium' | 'high' {
  // Calculate weighted average confidence
  const totalWeight = scores.reduce((sum, s) => sum + s.evidenceCount, 0);
  const weightedConfidence = scores.reduce((sum, s) => {
    return sum + (CONFIDENCE_WEIGHTS[s.confidence] * s.evidenceCount);
  }, 0) / totalWeight;

  // Map weighted confidence back to categorical values
  if (weightedConfidence >= 0.9) return 'high';
  if (weightedConfidence >= 0.7) return 'medium';
  return 'low';
}

// First, let's create the methodology explanation component
const MethodologyExplanation = ({ score }: { score: AggregateScore }) => (
  <div className="mt-4 space-y-3">
    <div>
      <p className="text-sm font-medium">Score Weighting:</p>
      <ul className="text-xs space-y-1.5 text-muted-foreground mt-1">
        <li className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-300 flex-shrink-0" />
          Senior feedback (40%): Strategic oversight and experience
        </li>
        <li className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-300 flex-shrink-0" />
          Peer feedback (35%): Day-to-day collaboration insights
        </li>
        <li className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-300 flex-shrink-0" />
          Junior feedback (25%): Upward management perspective
        </li>
      </ul>
    </div>

    <div>
      <p className="text-sm font-medium">Confidence Impact:</p>
      <ul className="text-xs space-y-1.5 text-muted-foreground mt-1">
        <li className="flex items-center gap-2">
          <span className={cn(
            "text-xs px-1.5 rounded-full font-medium",
            "bg-blue-100 text-blue-700"
          )}>high</span>
          100% weight - Strong evidence & consistency
        </li>
        <li className="flex items-center gap-2">
          <span className={cn(
            "text-xs px-1.5 rounded-full font-medium",
            "bg-yellow-100 text-yellow-700"
          )}>medium</span>
          80% weight - Good evidence with some gaps
        </li>
        <li className="flex items-center gap-2">
          <span className={cn(
            "text-xs px-1.5 rounded-full font-medium",
            "bg-red-100 text-red-700"
          )}>low</span>
          50% weight - Limited or inconsistent evidence
        </li>
      </ul>
    </div>

    {score.hasOutliers && (
      <div>
        <p className="text-sm font-medium">Outlier Handling:</p>
        <ul className="text-xs space-y-1.5 text-muted-foreground mt-1">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-300 flex-shrink-0" />
            Extreme scores (greater than 3σ) reduced to 50% impact
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-300 flex-shrink-0" />
            Moderate outliers (2-3σ) reduced to 75% impact
          </li>
        </ul>
      </div>
    )}
  </div>
);

// Create a component for the radar chart
const CompetencyRadarChart = ({ chartData }: { chartData: any[] }) => (
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
);

// Update the score card to use the new notification component
const OutlierNotification = ({ score }: { score: AggregateScore }) => {
  if (!score.hasOutliers || !score.adjustmentDetails?.length) return null;

  const extremeAdjustments = score.adjustmentDetails.filter(d => d.adjustmentType === 'extreme');
  const moderateAdjustments = score.adjustmentDetails.filter(d => d.adjustmentType === 'moderate');

  return (
    <>
      <br />
      <div className="text-yellow-600 space-y-1">
        <p>Note: Some outlier scores were adjusted:</p>
        <ul className="text-xs pl-4 space-y-0.5">
          {extremeAdjustments.length > 0 && (
            <li>
              • {extremeAdjustments.length} extreme {extremeAdjustments.length === 1 ? 'score' : 'scores'} reduced to 50% impact
              {extremeAdjustments.map((adj: AdjustmentDetail, i: number) => (
                <div key={i} className="pl-2 text-muted-foreground">
                  {adj.relationship} feedback: {adj.originalScore.toFixed(1)} → {(adj.originalScore * OUTLIER_THRESHOLDS.maxReduction).toFixed(1)}
                </div>
              ))}
            </li>
          )}
          {moderateAdjustments.length > 0 && (
            <li>
              • {moderateAdjustments.length} moderate {moderateAdjustments.length === 1 ? 'score' : 'scores'} reduced to 75% impact
              {moderateAdjustments.map((adj: AdjustmentDetail, i: number) => (
                <div key={i} className="pl-2 text-muted-foreground">
                  {adj.relationship} feedback: {adj.originalScore.toFixed(1)} → {(adj.originalScore * OUTLIER_THRESHOLDS.moderateReduction).toFixed(1)}
                </div>
              ))}
            </li>
          )}
        </ul>
      </div>
    </>
  );
};

// Create a component for the competency score card
const CompetencyScoreCard = ({ score }: { score: AggregateScore }) => (
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
        <div className="max-w-xs">
          <div className="space-y-1.5 mb-4">
            <h3 className="font-medium">{score.name}</h3>
            <span className={cn(
              "inline-block text-xs px-2 py-0.5 rounded-full font-medium",
              score.confidence === 'high' && "bg-blue-100 text-blue-700",
              score.confidence === 'medium' && "bg-yellow-100 text-yellow-700",
              score.confidence === 'low' && "bg-red-100 text-red-700"
            )}>
              {score.confidence} confidence
            </span>
          </div>

          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Score: {score.score.toFixed(1)}/5
              <br />
              Based on {score.evidenceCount} pieces of evidence
              <OutlierNotification score={score} />
            </p>
            
            <MethodologyExplanation score={score} />
          </div>

          {Object.values(CORE_COMPETENCIES).find(comp => comp.name === score.name) && (
            <div className="border-t pt-3">
              <h4 className="text-sm font-medium mb-2">Key Aspects:</h4>
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

// Main component remains the same but uses the new subcomponents
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