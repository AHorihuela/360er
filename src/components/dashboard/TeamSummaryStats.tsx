import { Star } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { StatCard } from './cards/StatCard';
import { 
  calculateWeightedAverageScore, 
  getScoreProgressClass, 
  getConfidenceClass, 
  getConfidenceLabel 
} from './utils/statCalculations';

export interface TeamSummaryStatsProps {
  employeesWithAnalytics: number;
  totalEmployees: number;
  includedReviewCount: number;
  totalReviewCount: number;
  averageEvidenceCount: number;
  evidenceCountByCompetency: Record<string, number>;
  averageConfidence: number;
  sortedScores: Array<{ name: string; score: number; confidence: 'low' | 'medium' | 'high' }>;
}

export function TeamSummaryStats({
  employeesWithAnalytics,
  totalEmployees,
  includedReviewCount,
  totalReviewCount,
  averageEvidenceCount,
  evidenceCountByCompetency,
  averageConfidence,
  sortedScores
}: TeamSummaryStatsProps) {
  const coveragePercentage = (employeesWithAnalytics / totalEmployees) * 100;
  const reviewPercentage = (includedReviewCount / totalReviewCount) * 100;
  const confidencePercentage = averageConfidence * 100;
  const weightedAverageScore = calculateWeightedAverageScore(sortedScores);
  const scoreProgressValue = ((weightedAverageScore - 1) / 4) * 100;
  const confidenceClasses = getConfidenceClass(confidencePercentage);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard
        title="Team Coverage"
        value={`${employeesWithAnalytics}/${totalEmployees}`}
        subtitle="employees analyzed"
        progress={{ value: coveragePercentage }}
        tooltip={{
          content: (
            <div className="space-y-2">
              <div className="font-medium">Employee Coverage</div>
              <div className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• {employeesWithAnalytics} employees with sufficient feedback</li>
                  <li>• Out of {totalEmployees} total employees</li>
                  <li>• Minimum 5 reviews required per employee</li>
                </ul>
              </div>
            </div>
          )
        }}
      />

      <StatCard
        title="Review Coverage"
        value={`${includedReviewCount}/${totalReviewCount}`}
        subtitle="reviews analyzed"
        progress={{ value: reviewPercentage }}
      />

      <StatCard
        title="Team Score"
        value={
          <div className="flex items-center gap-2">
            {weightedAverageScore.toFixed(1)}
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            <Badge 
              variant="secondary" 
              className={cn(
                confidenceClasses.base,
                confidenceClasses.hover,
                "ml-2 text-xs transition-colors"
              )}
            >
              {getConfidenceLabel(confidencePercentage)} Confidence
            </Badge>
          </div>
        }
        subtitle="average score"
        progress={{ 
          value: scoreProgressValue,
          className: getScoreProgressClass(scoreProgressValue)
        }}
        tooltip={{
          content: (
            <div className="space-y-2">
              <div className="font-medium">Average Competency Score</div>
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">
                  Weighted average of all competency scores across the team. The weight of each score is adjusted based on its confidence level to ensure more reliable data has greater impact.
                </p>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">Confidence Weights:</p>
                  <ul className="space-y-1">
                    <li className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-700">High</Badge>
                      <span>100% weight - Strong evidence & consistent feedback</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-amber-50 text-amber-700">Medium</Badge>
                      <span>70% weight - Moderate evidence with some variation</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-red-100 text-red-700">Low</Badge>
                      <span>40% weight - Limited evidence or high variation</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )
        }}
      />

      <StatCard
        title="Evidence Density"
        value={averageEvidenceCount.toFixed(1)}
        subtitle="examples per competency"
        tooltip={{
          content: (
            <div className="space-y-2">
              <div className="font-medium">Evidence Density</div>
              <div className="text-sm text-muted-foreground">
                The number of specific feedback examples our AI has identified and analyzed for each competency.
                <div className="mt-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left font-medium pb-2">Competency</th>
                        <th className="text-right font-medium pb-2">Examples</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {Object.entries(evidenceCountByCompetency).map(([competency, count]) => (
                        <tr key={competency}>
                          <td className="py-1.5">{competency}</td>
                          <td className="text-right py-1.5">{count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 pt-2 border-t text-xs">
                  Higher density indicates more detailed feedback and more comprehensive analysis.
                </div>
              </div>
            </div>
          )
        }}
      />

      <StatCard
        title="Analysis Confidence"
        value={`${confidencePercentage.toFixed(0)}%`}
        subtitle="average confidence"
        progress={{ 
          value: confidencePercentage,
          className: cn(
            confidencePercentage >= 80 ? "bg-green-100 [&>div]:bg-green-500" :
            confidencePercentage >= 60 ? "bg-yellow-100 [&>div]:bg-yellow-500" :
            "bg-red-100 [&>div]:bg-red-500"
          )
        }}
        tooltip={{
          content: (
            <div className="space-y-2">
              <div className="font-medium">Confidence Score</div>
              <div className="text-sm text-muted-foreground">
                Based on:
                <ul className="space-y-1 mt-1">
                  <li>• Evidence quantity and quality</li>
                  <li>• Score consistency</li>
                  <li>• Relationship coverage</li>
                </ul>
              </div>
            </div>
          )
        }}
      />
    </div>
  );
} 