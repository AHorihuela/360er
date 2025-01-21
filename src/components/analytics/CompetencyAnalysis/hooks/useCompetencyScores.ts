import { useMemo } from 'react';
import { type DashboardFeedbackRequest } from '@/types/feedback/dashboard';
import { type CompetencyFilters, type RelationshipType } from '../types';
import { RELATIONSHIP_WEIGHTS } from '@/components/dashboard/constants';

/**
 * Represents a processed competency score with additional metadata
 * @interface CompetencyScore
 * @property {string} name - Name of the competency
 * @property {number} score - Numerical score (1-5)
 * @property {string} confidence - Confidence level of the score
 * @property {string} description - Description of the competency
 * @property {number} evidenceCount - Number of evidence pieces supporting the score
 * @property {number} effectiveEvidenceCount - Adjusted evidence count after outlier detection
 * @property {string} relationship - Relationship type of the reviewer
 * @property {string[]} evidenceQuotes - Supporting evidence quotes
 * @property {boolean} hasOutliers - Whether outliers were detected in the scores
 * @property {number} adjustedWeight - Weight adjusted for outliers
 */
export interface CompetencyScore {
  name: string;
  score: number;
  confidence: string;
  description: string;
  evidenceCount: number;
  effectiveEvidenceCount: number;
  relationship: string;
  evidenceQuotes: string[];
  hasOutliers: boolean;
  adjustedWeight: number;
}

/**
 * Result type for the useCompetencyScores hook
 * @interface CompetencyScoresResult
 * @property {Map<string, CompetencyScore[]>} allScores - All scores grouped by competency
 * @property {Map<string, CompetencyScore[]>} filteredScores - Filtered scores based on current filters
 */
interface CompetencyScoresResult {
  allScores: Map<string, CompetencyScore[]>;
  filteredScores: Map<string, CompetencyScore[]>;
}

/**
 * Hook to process and filter competency scores from feedback requests.
 * 
 * Features:
 * - Processes raw feedback data into structured competency scores
 * - Applies relationship-based filtering
 * - Normalizes relationship types (handling 'equal' as 'peer')
 * - Maintains both filtered and unfiltered score sets
 * 
 * @param {DashboardFeedbackRequest[]} feedbackRequests - Raw feedback data
 * @param {CompetencyFilters} [filters] - Optional filters to apply
 * @returns {CompetencyScoresResult} Processed and filtered scores
 * 
 * @example
 * ```tsx
 * const { allScores, filteredScores } = useCompetencyScores(feedbackRequests, {
 *   relationships: ['senior', 'peer']
 * });
 * ```
 */
export function useCompetencyScores(
  feedbackRequests: DashboardFeedbackRequest[],
  filters?: CompetencyFilters
): CompetencyScoresResult {
  return useMemo(() => {
    // Initialize score collection
    const scores = new Map<string, CompetencyScore[]>();

    // Process all feedback requests
    feedbackRequests.forEach(request => {
      if (!request.analytics?.insights) return;

      // Process each insight's competencies
      request.analytics.insights.forEach(insight => {
        insight.competencies.forEach(comp => {
          // Initialize competency entry if needed
          if (!scores.has(comp.name)) {
            scores.set(comp.name, []);
          }
          
          // Create and store the score
          const compScores = scores.get(comp.name)!;
          const score: CompetencyScore = {
            name: comp.name,
            score: comp.score,
            confidence: comp.confidence,
            description: comp.description,
            evidenceCount: comp.evidenceCount,
            effectiveEvidenceCount: comp.evidenceCount,
            relationship: insight.relationship,
            evidenceQuotes: comp.evidenceQuotes ?? [],
            hasOutliers: false,
            adjustedWeight: RELATIONSHIP_WEIGHTS[insight.relationship.replace('_colleague', '') as keyof typeof RELATIONSHIP_WEIGHTS]
          };
          compScores.push(score);
        });
      });
    });

    // Apply filters to create filtered score set
    const filteredScores = new Map<string, CompetencyScore[]>();
    scores.forEach((compScores, compName) => {
      const filtered = compScores.filter(score => {
        if (filters?.relationships && filters.relationships.length > 0) {
          // Normalize relationship type
          const baseType = score.relationship.replace('_colleague', '');
          const normalizedType = baseType === 'equal' ? 'peer' : baseType;
          return filters.relationships.includes(normalizedType as RelationshipType);
        }
        return true;
      });
      
      if (filtered.length > 0) {
        filteredScores.set(compName, filtered);
      }
    });

    return {
      allScores: scores,
      filteredScores
    };
  }, [feedbackRequests, filters?.relationships]);
} 