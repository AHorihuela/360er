import { type DashboardFeedbackRequest } from '@/types/feedback/dashboard';
import { type CompetencyFilters } from './types';
import { useCompetencyScores } from './hooks/useCompetencyScores';
import { useCoverageMetrics } from './hooks/useCoverageMetrics';
import { CoverageMetrics } from './components/CoverageMetrics';
import { CompetencyScoreCards } from './components/CompetencyScoreCards';

interface CompetencyAnalysisProps {
  feedbackRequests: DashboardFeedbackRequest[];
  title?: string;
  subtitle?: string;
  showTeamStats?: boolean;
  filters?: CompetencyFilters;
}

export function CompetencyAnalysis({ 
  feedbackRequests,
  title = "Team Competency Analysis",
  subtitle,
  showTeamStats = true,
  filters
}: CompetencyAnalysisProps) {
  const { allScores, filteredScores } = useCompetencyScores(feedbackRequests, filters);
  const coverageMetrics = useCoverageMetrics(feedbackRequests, filters);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>

      {showTeamStats && <CoverageMetrics {...coverageMetrics} />}

      <CompetencyScoreCards 
        allScores={allScores} 
        filteredScores={filteredScores} 
      />
    </div>
  );
} 