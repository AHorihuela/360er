import { type CompetencyScore } from '../hooks/useCompetencyScores';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface CompetencyScoreCardsProps {
  allScores: Map<string, CompetencyScore[]>;
  filteredScores: Map<string, CompetencyScore[]>;
}

export function CompetencyScoreCards({ allScores, filteredScores }: CompetencyScoreCardsProps) {
  // Use allScores to determine the complete set of competencies
  const competencyNames = Array.from(allScores.keys());

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {competencyNames.map(name => {
        const scores = filteredScores.get(name) || allScores.get(name) || [];
        const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

        return (
          <Card key={name} className="p-6">
            <h3 className="text-lg font-medium">{name}</h3>
            <div className="mt-2">
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
          </Card>
        );
      })}
    </div>
  );
} 