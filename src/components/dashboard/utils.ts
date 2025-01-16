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

export function calculateConfidence(scores: ScoreWithOutlier[]): 'low' | 'medium' | 'high' {
  const totalEvidence = scores.reduce((sum, s) => sum + s.evidenceCount, 0);
  
  // Calculate score variance to check consistency
  const values = scores.map(s => s.score);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  
  // Base confidence on evidence count (from documentation)
  let baseConfidence: 'low' | 'medium' | 'high';
  if (totalEvidence >= 10) baseConfidence = 'high';
  else if (totalEvidence >= 5) baseConfidence = 'medium';
  else baseConfidence = 'low';
  
  // Adjust based on variance (from documentation)
  if (variance > 2.0) {
    // High variance reduces confidence
    return baseConfidence === 'high' ? 'medium' : 'low';
  } else if (variance > 1.0) {
    // Moderate variance may reduce high confidence
    return baseConfidence === 'low' ? 'low' : 'medium';
  }
  
  // Check relationship coverage (requires relationship field to be added to ScoreWithOutlier)
  const relationships = new Set(scores.map(s => s.relationship));
  if (relationships.size < 2 && baseConfidence === 'high') {
    baseConfidence = 'medium';
  }
  
  return baseConfidence;
} 