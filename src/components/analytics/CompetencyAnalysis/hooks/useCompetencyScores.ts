import { useMemo } from 'react';
import { type DashboardFeedbackRequest } from '@/types/feedback/dashboard';
import { type CompetencyFilters, type RelationshipType } from '../types';
import { RELATIONSHIP_WEIGHTS } from '@/components/dashboard/constants';

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

interface CompetencyScoresResult {
  allScores: Map<string, CompetencyScore[]>;
  filteredScores: Map<string, CompetencyScore[]>;
}

export function useCompetencyScores(
  feedbackRequests: DashboardFeedbackRequest[],
  filters?: CompetencyFilters
): CompetencyScoresResult {
  return useMemo(() => {
    const scores = new Map<string, CompetencyScore[]>();

    feedbackRequests.forEach(request => {
      if (!request.analytics?.insights) return;

      request.analytics.insights.forEach(insight => {
        // Store all scores first, before filtering
        insight.competencies.forEach(comp => {
          if (!scores.has(comp.name)) {
            scores.set(comp.name, []);
          }
          
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

    // Now apply filters and calculate scores
    const filteredScores = new Map<string, CompetencyScore[]>();
    scores.forEach((compScores, compName) => {
      const filtered = compScores.filter(score => {
        if (filters?.relationships && filters.relationships.length > 0) {
          // Normalize relationship type by removing _colleague and handling equal/peer
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