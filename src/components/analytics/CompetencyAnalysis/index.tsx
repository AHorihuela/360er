import { type DashboardFeedbackRequest } from '@/types/feedback/dashboard';
import { type CompetencyFilters } from './types';
import { useCompetencyScores } from './hooks/useCompetencyScores';
import { CompetencyHeader } from './components/CompetencyHeader';
import { CompetencyCard } from './components/CompetencyCard';
import { ScoreDistribution } from './components/ScoreDistribution';
import { TeamSummaryStats } from '@/components/dashboard/TeamSummaryStats';
import { COMPETENCY_ORDER } from '@/components/dashboard/constants';

interface CompetencyAnalysisProps {
  feedbackRequests: DashboardFeedbackRequest[];
  filters?: CompetencyFilters;
  showTeamStats?: boolean;
  title?: string;
}

export function CompetencyAnalysis({ 
  feedbackRequests, 
  filters,
  showTeamStats = true,
  title = "Team Competency Analysis"
}: CompetencyAnalysisProps) {
  const {
    sortedScores,
    employeesWithAnalytics,
    totalEmployees,
    includedReviewCount,
    analyzedReviewCount,
    averageConfidence,
    evidenceCountByCompetency
  } = useCompetencyScores(feedbackRequests, filters);

  if (sortedScores.length === 0) {
    return null;
  }

  const averageEvidenceCount = sortedScores.reduce((sum, s) => sum + s.evidenceCount, 0) / sortedScores.length;

  return (
    <div className="space-y-6">
      <CompetencyHeader 
        title={title}
        hasInsufficientData={COMPETENCY_ORDER.length > sortedScores.length} 
      />

      {showTeamStats && (
        <TeamSummaryStats
          employeesWithAnalytics={employeesWithAnalytics}
          totalEmployees={totalEmployees}
          includedReviewCount={includedReviewCount}
          totalReviewCount={analyzedReviewCount}
          averageEvidenceCount={averageEvidenceCount}
          evidenceCountByCompetency={evidenceCountByCompetency}
          averageConfidence={averageConfidence}
          sortedScores={sortedScores}
        />
      )}

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