import { type CompetencyScore } from '../hooks/useCompetencyScores';
import { CompetencyCard } from './CompetencyCard';

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
        // Get description from the first score (they all have the same description)
        const description = scores[0]?.description;

        return (
          <CompetencyCard
            key={name}
            name={name}
            scores={scores}
            description={description}
          />
        );
      })}
    </div>
  );
} 