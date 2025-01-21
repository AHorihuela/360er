import { type DashboardFeedbackRequest } from '@/types/feedback/dashboard';
import { type CompetencyFilters } from './types';
import { useCompetencyScores } from './hooks/useCompetencyScores';
import { CompetencyHeader } from './components/CompetencyHeader';
import { CompetencyCard } from './components/CompetencyCard';
import { ScoreDistribution } from './components/ScoreDistribution';
import { COMPETENCY_ORDER } from '@/components/dashboard/constants';

interface CompetencyAnalysisProps {
  feedbackRequests: DashboardFeedbackRequest[];
  filters?: CompetencyFilters;
}

export function CompetencyAnalysis({ feedbackRequests, filters }: CompetencyAnalysisProps) {
  const {
    sortedScores
  } = useCompetencyScores(feedbackRequests, filters);

  return (
    <div className="space-y-6">
      <CompetencyHeader 
        title="Competency Analysis" 
        hasInsufficientData={COMPETENCY_ORDER.length > sortedScores.length} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedScores.map(score => (
          <div key={score.name} className="space-y-4">
            <CompetencyCard score={score} />
            <ScoreDistribution score={score} />
          </div>
        ))}
      </div>
    </div>
  );
} 