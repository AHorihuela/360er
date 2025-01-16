import { CONFIDENCE_WEIGHTS, OUTLIER_THRESHOLDS, RELATIONSHIP_WEIGHTS } from './constants';
import { ScoreWithOutlier, AdjustmentDetail } from './types';

// Helper function to calculate quartiles
function calculateQuartiles(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  return {
    q1: sorted[q1Index],
    q3: sorted[q3Index],
    median: sorted[Math.floor(sorted.length * 0.5)]
  };
}

// Helper function to check if a score is contextually valid
function isContextuallyValid(score: number, competencyName: string): boolean {
  const thresholds = Object.entries(OUTLIER_THRESHOLDS.contextualThresholds).find(([key]) => 
    competencyName.toLowerCase().includes(key)
  );
  
  if (!thresholds) return true; // No specific threshold found
  const [_, { min, max }] = thresholds;
  return score >= min && score <= max;
}

export function detectOutliers(scores: ScoreWithOutlier[]): ScoreWithOutlier[] {
  if (scores.length < OUTLIER_THRESHOLDS.minSampleSize) return scores;

  // Group scores by relationship type
  const relationshipGroups = new Map<string, ScoreWithOutlier[]>();
  scores.forEach(score => {
    const group = relationshipGroups.get(score.relationship) || [];
    group.push(score);
    relationshipGroups.set(score.relationship, group);
  });

  // Calculate overall statistics
  const values = scores.map(s => s.score);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Calculate quartiles for boxplot method
  const { q1, q3 } = calculateQuartiles(values);
  const iqr = q3 - q1;
  const lowerBound = q1 - (iqr * OUTLIER_THRESHOLDS.iqrMultiplier);
  const upperBound = q3 + (iqr * OUTLIER_THRESHOLDS.iqrMultiplier);

  return scores.map(score => {
    // Skip adjustment if not enough samples for this relationship type
    const relationshipGroup = relationshipGroups.get(score.relationship) || [];
    if (relationshipGroup.length < OUTLIER_THRESHOLDS.relationshipMinSamples) {
      return {
        ...score,
        adjustedWeight: RELATIONSHIP_WEIGHTS[score.relationship as keyof typeof RELATIONSHIP_WEIGHTS]
      };
    }

    const zScore = (score.score - mean) / stdDev;
    const isBoxplotOutlier = score.score < lowerBound || score.score > upperBound;
    const isContextualOutlier = !isContextuallyValid(score.score, score.name);
    
    // Apply confidence weighting
    const confidenceWeight = OUTLIER_THRESHOLDS.confidenceWeights[score.confidence];
    const baseWeight = RELATIONSHIP_WEIGHTS[score.relationship as keyof typeof RELATIONSHIP_WEIGHTS];

    // Determine outlier severity
    let adjustmentType: 'none' | 'moderate' | 'extreme' = 'none';
    let adjustedWeight = baseWeight * confidenceWeight;

    if (isContextualOutlier || Math.abs(zScore) > 3 || (isBoxplotOutlier && Math.abs(zScore) > 2)) {
      adjustmentType = 'extreme';
      adjustedWeight *= OUTLIER_THRESHOLDS.maxReduction;
    } else if (Math.abs(zScore) > OUTLIER_THRESHOLDS.maxZScore || isBoxplotOutlier) {
      adjustmentType = 'moderate';
      adjustedWeight *= OUTLIER_THRESHOLDS.moderateReduction;
    }

    // Calculate relationship-specific statistics for additional context
    const relationshipValues = relationshipGroup.map(s => s.score);
    const relationshipMean = relationshipValues.reduce((sum, val) => sum + val, 0) / relationshipValues.length;
    const relationshipStdDev = Math.sqrt(
      relationshipValues.reduce((sum, val) => sum + Math.pow(val - relationshipMean, 2), 0) / relationshipValues.length
    );

    // Only adjust if also an outlier within its relationship group
    const relationshipZScore = (score.score - relationshipMean) / relationshipStdDev;
    if (Math.abs(relationshipZScore) <= OUTLIER_THRESHOLDS.maxZScore) {
      adjustmentType = 'none';
      adjustedWeight = baseWeight * confidenceWeight;
    }

    return {
      ...score,
      adjustedWeight,
      adjustmentDetails: adjustmentType !== 'none' ? [{
        originalScore: score.score,
        adjustmentType,
        relationship: score.relationship
      }] : undefined
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