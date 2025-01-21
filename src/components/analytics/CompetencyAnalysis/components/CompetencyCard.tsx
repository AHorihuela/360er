import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { type ScoreWithOutlier } from "@/components/dashboard/types";

interface CompetencyCardProps {
  score: ScoreWithOutlier;
}

export function CompetencyCard({ score }: CompetencyCardProps) {
  // Calculate progress value (1-5 scale to 0-100)
  const progressValue = ((score.score - 1) / 4) * 100;
  
  // Calculate confidence percentage with fallback
  const confidencePercentage = score.confidenceMetrics?.finalScore 
    ? (score.confidenceMetrics.finalScore * 100).toFixed(0)
    : "N/A";

  return (
    <Card className="p-4">
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium">{score.name}</h3>
            {score.description && (
              <p className="text-sm text-muted-foreground mt-1">{score.description}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold">{score.score.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground">average score</div>
          </div>
        </div>
        <Progress value={progressValue} className="h-2" />
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div>
            <div className="text-sm font-medium">{score.evidenceCount}</div>
            <div className="text-xs text-muted-foreground">examples found</div>
          </div>
          <div>
            <div className="text-sm font-medium">{(score.scoreSpread || 0).toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">score spread</div>
          </div>
          <div>
            <div className="text-sm font-medium">{confidencePercentage}%</div>
            <div className="text-xs text-muted-foreground">confidence</div>
          </div>
        </div>
      </div>
    </Card>
  );
} 