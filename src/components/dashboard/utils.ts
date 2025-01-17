import { CONFIDENCE_WEIGHTS, OUTLIER_THRESHOLDS, RELATIONSHIP_WEIGHTS, MIN_REVIEWS_REQUIRED } from './constants';
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

interface ConfidenceMetrics {
  evidenceScore: number;
  consistencyScore: number;
  relationshipScore: number;
  finalScore: number;
  factors: {
    evidenceCount: number;
    variance: number;
    relationshipCount: number;
    distributionQuality: number;
  };
}

export function calculateConfidence(scores: ScoreWithOutlier[]): { 
  level: 'low' | 'medium' | 'high';
  metrics: ConfidenceMetrics;
} {
  const competencyName = scores[0]?.name || 'Unknown';

  // 1. Evidence Quantity Assessment with reviewer-based diminishing returns
  const evidenceByReviewer = new Map<string, number>();
  let totalEffectiveEvidence = 0;
  
  scores.forEach(s => {
    // Track evidence per reviewer
    const reviewerId = `${s.relationship}_${s.reviewerId || 'unknown'}`;
    
    // Apply diminishing returns for multiple pieces from same reviewer
    const effectiveCount = 
      1 + (s.evidenceCount > 1 ? 
        // Additional mentions count for less and diminish rapidly
        Array.from({length: s.evidenceCount - 1})
          .reduce((sum: number, _, idx) => sum + Math.pow(0.5, idx + 1), 0) : 0);
    
    evidenceByReviewer.set(reviewerId, effectiveCount);
    totalEffectiveEvidence += effectiveCount;
  });

  // Adjust thresholds based on effective evidence count
  const evidenceScore = Math.min(1, totalEffectiveEvidence / 15);

  // 2. Score Consistency Analysis
  const values = scores.map(s => s.score);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const consistencyScore = Math.max(0, 1 - variance / 2.0);

  // 3. Relationship Coverage Analysis
  const relationships = new Set(scores
    .map(s => s.relationship)
    .filter(r => r !== 'aggregate')); // Exclude 'aggregate' from relationship count
  const relationshipCount = relationships.size;
  
  const relationshipGroups = new Map<string, number>();
  scores.forEach(s => {
    if (s.relationship !== 'aggregate') { // Only count non-aggregate relationships
      relationshipGroups.set(s.relationship, (relationshipGroups.get(s.relationship) || 0) + 1);
    }
  });

  const minReviewsPerRelationship = Math.min(...Array.from(relationshipGroups.values()));
  const relationshipScore = 
    (relationshipCount >= 2 ? 0.7 : 0.3) +
    (relationshipCount >= 3 ? 0.2 : 0) +
    (minReviewsPerRelationship >= 3 ? 0.1 : 0);

  // 4. Distribution Quality Check
  const idealCount = scores.length / relationshipCount;
  const maxSkew = Math.max(...Array.from(relationshipGroups.values())) / idealCount;
  const distributionQuality = Math.max(0, 1 - (maxSkew - 1) / 1.5);

  // 5. Weighted Final Score Calculation
  const weights = {
    evidence: 0.4,
    consistency: 0.3,
    relationship: 0.2,
    distribution: 0.1
  };

  const finalScore = (
    evidenceScore * weights.evidence +
    consistencyScore * weights.consistency +
    relationshipScore * weights.relationship +
    distributionQuality * weights.distribution
  );

  // Confidence Level Determination
  let level: 'low' | 'medium' | 'high';
  
  // High confidence requires good evidence AND consistency
  if (totalEffectiveEvidence >= 12 && consistencyScore >= 0.5 && finalScore >= 0.65) {
    level = 'high';
  }
  // Medium confidence needs decent evidence OR good consistency
  else if ((totalEffectiveEvidence >= 8 && consistencyScore >= 0.3) || 
           (consistencyScore >= 0.5 && finalScore >= 0.55)) {
    level = 'medium';
  }
  // Otherwise low confidence
  else {
    level = 'low';
  }

  // Only log in development environment and when explicitly requested
  if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_CONFIDENCE === 'true') {
    console.group(`Confidence Calculation for ${competencyName}`);
    console.log('Evidence Analysis:', {
      totalEffectiveEvidence,
      evidenceScore,
      evidenceByReviewer: Object.fromEntries(evidenceByReviewer)
    });
    console.log('Consistency Analysis:', { mean, variance, consistencyScore });
    console.log('Relationship Analysis:', {
      relationshipCount,
      relationshipGroups: Object.fromEntries(relationshipGroups),
      minReviewsPerRelationship,
      relationshipScore
    });
    console.log('Distribution Analysis:', { idealCount, maxSkew, distributionQuality });
    console.log('Final Score Components:', {
      evidenceComponent: evidenceScore * weights.evidence,
      consistencyComponent: consistencyScore * weights.consistency,
      relationshipComponent: relationshipScore * weights.relationship,
      distributionComponent: distributionQuality * weights.distribution,
      finalScore
    });
    console.log('Confidence Level:', { level });
    console.groupEnd();
  }

  return {
    level,
    metrics: {
      evidenceScore,
      consistencyScore,
      relationshipScore,
      finalScore,
      factors: {
        evidenceCount: totalEffectiveEvidence,
        variance,
        relationshipCount,
        distributionQuality
      }
    }
  };
} 