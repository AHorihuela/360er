import { useRef, useEffect } from 'react';
import { CORE_COMPETENCIES, COMPETENCY_NAME_TO_KEY } from '@/lib/competencies';
import { ScoreWithOutlier } from './types';
import { ScoreDistributionCard } from './cards/ScoreDistributionCard';
import { EvidenceBaseCard } from './cards/EvidenceBaseCard';
import { RelationshipCoverageCard } from './cards/RelationshipCoverageCard';
import { AreasOfEvaluation } from './sections/AreasOfEvaluation';
import { PerformanceOverview } from './sections/PerformanceOverview';
import { LevelAndGrowth } from './sections/LevelAndGrowth';

interface CompetencyDetailsProps {
  score: ScoreWithOutlier;
}

export function CompetencyDetails({ score }: CompetencyDetailsProps) {
  console.log('CompetencyDetails - score:', score);
  console.log('CompetencyDetails - evidenceQuotes:', score.evidenceQuotes);
  
  const detailsRef = useRef<HTMLDivElement>(null);
  const competencyKey = COMPETENCY_NAME_TO_KEY[score.name];
  const competency = competencyKey ? CORE_COMPETENCIES[competencyKey] : null;

  // Focus management for accessibility
  useEffect(() => {
    if (detailsRef.current) {
      detailsRef.current.focus();
    }
  }, []);

  return (
    <div 
      ref={detailsRef}
      tabIndex={-1}
      className="mt-4 pt-4 border-t space-y-6 focus:outline-none"
      role="region"
      aria-label={`Detailed analysis for ${score.name}`}
    >
      {/* Areas of Evaluation */}
      <AreasOfEvaluation competency={competency} />

      {/* Analysis Grid - Feedback Data */}
      <div className="grid grid-cols-3 gap-4">
        <EvidenceBaseCard score={score} />
        <ScoreDistributionCard score={score} />
        <RelationshipCoverageCard score={score} />
      </div>

      {/* Performance Overview */}
      <PerformanceOverview score={score} />

      {/* Current Level & Growth */}
      <LevelAndGrowth score={score} competency={competency} />
    </div>
  );
} 