import { useMemo } from 'react';
import { type CompetencyScore } from './useCompetencyScores';
import { CONFIDENCE_WEIGHTS } from '@/components/dashboard/constants';

interface ConfidenceMetrics {
  level: 'low' | 'medium' | 'high';
  score: number;
  factors: {
    evidenceCount: number;
    relationshipCoverage: number;
    scoreConsistency: number;
    distributionQuality: number;
  };
}

export function useConfidenceMetrics(scores: CompetencyScore[]): ConfidenceMetrics {
  return useMemo(() => {
    // Calculate evidence quantity factor (0-1)
    const totalEvidence = scores.reduce((sum, s) => sum + s.evidenceCount, 0);
    const evidenceCount = Math.min(totalEvidence / 10, 1); // Cap at 10 pieces of evidence

    // Calculate relationship coverage (0-1)
    const relationships = new Set(scores.map(s => s.relationship.replace('_colleague', '')));
    const relationshipCoverage = relationships.size / 3; // 3 possible relationships

    // Calculate score consistency (0-1)
    const allScores = scores.map(s => s.score);
    const avgScore = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
    const variance = allScores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / allScores.length;
    const scoreConsistency = Math.max(0, 1 - (variance / 2)); // Lower variance means higher consistency

    // Calculate distribution quality (0-1)
    const hasOutliers = scores.some(s => s.hasOutliers);
    const distributionQuality = hasOutliers ? 0.5 : 1;

    // Calculate overall confidence score (0-1)
    const weightedScore = (
      evidenceCount * 0.3 +
      relationshipCoverage * 0.3 +
      scoreConsistency * 0.2 +
      distributionQuality * 0.2
    );

    // Determine confidence level
    let level: 'low' | 'medium' | 'high';
    if (weightedScore >= 0.8) level = 'high';
    else if (weightedScore >= 0.6) level = 'medium';
    else level = 'low';

    return {
      level,
      score: weightedScore,
      factors: {
        evidenceCount: evidenceCount,
        relationshipCoverage,
        scoreConsistency,
        distributionQuality
      }
    };
  }, [scores]);
} 