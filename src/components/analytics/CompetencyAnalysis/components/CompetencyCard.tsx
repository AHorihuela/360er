import { type CompetencyScore } from '../hooks/useCompetencyScores';
import { useConfidenceMetrics } from '../hooks/useConfidenceMetrics';
import { ScoreDistribution } from './ScoreDistribution';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CompetencyCardProps {
  name: string;
  scores: CompetencyScore[];
  description?: string;
}

export function CompetencyCard({ name, scores, description }: CompetencyCardProps) {
  const confidence = useConfidenceMetrics(scores);
  const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

  // Calculate relationship breakdown
  const relationshipCounts = scores.reduce((acc, score) => {
    const baseType = score.relationship.replace('_colleague', '');
    const type = baseType === 'equal' ? 'peer' : baseType;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get evidence quotes
  const evidenceQuotes = Array.from(new Set(scores.flatMap(s => s.evidenceQuotes))).slice(0, 3);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">{name}</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className={`px-2 py-1 rounded text-sm ${
                    confidence.level === 'high' ? 'bg-green-100 text-green-800' :
                    confidence.level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {confidence.level.charAt(0).toUpperCase() + confidence.level.slice(1)} Confidence
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p>Confidence Score: {(confidence.score * 100).toFixed(0)}%</p>
                    <p>Evidence: {(confidence.factors.evidenceCount * 100).toFixed(0)}%</p>
                    <p>Coverage: {(confidence.factors.relationshipCoverage * 100).toFixed(0)}%</p>
                    <p>Consistency: {(confidence.factors.scoreConsistency * 100).toFixed(0)}%</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>

        {/* Score */}
        <div>
          <div className="text-3xl font-bold">
            {avgScore.toFixed(1)}
          </div>
          <Progress 
            value={avgScore * 20} // Convert 0-5 scale to 0-100
            className="mt-2" 
          />
          <div className="text-sm text-muted-foreground mt-1">
            Based on {scores.length} reviews
          </div>
        </div>

        {/* Score Distribution */}
        <ScoreDistribution scores={scores} />

        {/* Relationship Breakdown */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Feedback Sources</h4>
          <div className="grid grid-cols-3 gap-2">
            {['senior', 'peer', 'junior'].map(type => (
              <div key={type} className="text-center">
                <div className="text-lg font-semibold">
                  {relationshipCounts[type] || 0}
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                  {type}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Evidence Quotes */}
        {evidenceQuotes.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Supporting Evidence</h4>
            <div className="space-y-2">
              {evidenceQuotes.map((quote, i) => (
                <div key={i} className="text-sm text-muted-foreground">
                  "{quote}"
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
} 