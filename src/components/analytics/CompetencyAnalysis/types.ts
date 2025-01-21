import { type DashboardFeedbackRequest } from "@/types/feedback/dashboard";

export interface AnalyticsFilters {
  employeeIds: string[];
  relationships: ('senior' | 'peer' | 'junior')[];
  cycleIds: string[];
}

export interface CompetencyAnalysisProps {
  feedbackRequests: DashboardFeedbackRequest[];
  filters?: AnalyticsFilters;
  showTeamStats?: boolean;
  showDetailedView?: boolean;
}

export interface Employee {
  id: string;
  name: string;
}

export interface ReviewCycle {
  id: string;
  title: string;
}

export type RelationshipType = "senior" | "peer" | "junior";

/**
 * Represents the filters that can be applied to competency analysis
 */
export interface CompetencyFilters {
  /**
   * Array of relationship types to filter by (senior, peer, junior)
   */
  relationships?: ('senior' | 'peer' | 'junior')[];
  
  /**
   * Array of employee IDs to filter by
   */
  employeeIds?: string[];
}

export interface CompetencyFiltersProps {
  filters: CompetencyFilters;
  onFiltersChange: (filters: CompetencyFilters) => void;
  employees: Employee[];
  cycles: ReviewCycle[];
} 