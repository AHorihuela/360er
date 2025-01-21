import { useMemo } from 'react';
import { type CompetencyScore } from './useCompetencyScores';

/**
 * Metrics used to calculate confidence level
 * @interface ConfidenceMetrics
 * @property {('low' | 'medium' | 'high')} level - Overall confidence level
 * @property {number} score - Numerical confidence score (0-1)
 * @property {Object} factors - Individual factors contributing to confidence
 * @property {number} factors.evidenceCount - Score based on amount of evidence (0-1)
 * @property {number} factors.relationshipCoverage - Score based on feedback source diversity (0-1)
 * @property {number} factors.scoreConsistency - Score based on variance in ratings (0-1)
 * @property {number} factors.distributionQuality - Score based on outlier presence (0-1)
 */
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

/**
 * Hook to calculate confidence metrics for a set of competency scores.
 * 
 * The confidence calculation considers multiple factors:
 * - Evidence quantity: More evidence increases confidence
 * - Relationship coverage: Feedback from diverse sources increases confidence
 * - Score consistency: Lower variance in scores increases confidence
 * - Distribution quality: Absence of outliers increases confidence
 * 
 * @param {CompetencyScore[]} scores - Array of scores to analyze
 * @returns {ConfidenceMetrics} Calculated confidence metrics
 * 
 * @example
 * ```tsx
 * const scores = [...]; // Array of CompetencyScore
 * const confidence = useConfidenceMetrics(scores);
 * 
 * console.log(confidence.level); // 'high', 'medium', or 'low'
 * console.log(confidence.score); // numerical score between 0 and 1
 * ```
 */
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
      evidenceCount * 0.3 +        // 30% weight for evidence quantity
      relationshipCoverage * 0.3 + // 30% weight for relationship coverage
      scoreConsistency * 0.2 +     // 20% weight for score consistency
      distributionQuality * 0.2    // 20% weight for distribution quality
    );

    // Determine confidence level based on score thresholds
    let level: 'low' | 'medium' | 'high';
    if (weightedScore >= 0.8) level = 'high';
    else if (weightedScore >= 0.6) level = 'medium';
    else level = 'low';

    return {
      level,
      score: weightedScore,
      factors: {
        evidenceCount,
        relationshipCoverage,
        scoreConsistency,
        distributionQuality
      }
    };
  }, [scores]);
} 