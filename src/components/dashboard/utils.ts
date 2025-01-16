import { CONFIDENCE_WEIGHTS, OUTLIER_THRESHOLDS, RELATIONSHIP_WEIGHTS } from './constants';
import { ScoreWithOutlier, AdjustmentDetail } from './types';

export function detectOutliers(scores: ScoreWithOutlier[]): ScoreWithOutlier[] {
  if (scores.length < 3) return scores;

  const values = scores.map(s => s.score);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (variance <= OUTLIER_THRESHOLDS.varianceThreshold) return scores;

  return scores.map(score => {
    const zScore = (score.score - mean) / stdDev;
    const baseWeight = RELATIONSHIP_WEIGHTS[score.relationship as keyof typeof RELATIONSHIP_WEIGHTS] || 1;
    
    if (Math.abs(zScore) > 3) {
      const adjustmentDetail: AdjustmentDetail = {
        originalScore: score.score,
        adjustmentType: 'extreme',
        relationship: score.relationship
      };
      return {
        ...score,
        adjustedWeight: baseWeight * OUTLIER_THRESHOLDS.maxReduction,
        adjustmentDetails: [adjustmentDetail]
      };
    } else if (Math.abs(zScore) > OUTLIER_THRESHOLDS.maxZScore) {
      const adjustmentDetail: AdjustmentDetail = {
        originalScore: score.score,
        adjustmentType: 'moderate',
        relationship: score.relationship
      };
      return {
        ...score,
        adjustedWeight: baseWeight * OUTLIER_THRESHOLDS.moderateReduction,
        adjustmentDetails: [adjustmentDetail]
      };
    }
    
    return {
      ...score,
      adjustedWeight: baseWeight
    };
  });
}

export function calculateConfidence(scores: Array<{
  score: number;
  confidence: 'low' | 'medium' | 'high';
  evidenceCount: number;
  relationship: string;
}>): 'low' | 'medium' | 'high' {
  const totalWeight = scores.reduce((sum, s) => sum + s.evidenceCount, 0);
  const weightedConfidence = scores.reduce((sum, s) => {
    return sum + (CONFIDENCE_WEIGHTS[s.confidence] * s.evidenceCount);
  }, 0) / totalWeight;

  if (weightedConfidence >= 0.9) return 'high';
  if (weightedConfidence >= 0.7) return 'medium';
  return 'low';
} 