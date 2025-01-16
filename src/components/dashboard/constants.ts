export const MIN_REVIEWS_REQUIRED = 5;

export const COMPETENCY_ORDER = [
  'Technical/Functional Expertise',
  'Leadership & Influence',
  'Collaboration & Communication',
  'Innovation & Problem-Solving',
  'Execution & Accountability',
  'Emotional Intelligence & Culture Fit',
  'Growth & Development'
] as const;

export const RELATIONSHIP_WEIGHTS = {
  senior: 0.4,
  peer: 0.35,
  junior: 0.25,
  aggregate: 1 // Used for already aggregated scores
} as const;

export const CONFIDENCE_WEIGHTS = {
  low: 0.5,
  medium: 0.8,
  high: 1.0
} as const;

export const OUTLIER_THRESHOLDS = {
  minZScore: -2,    // Scores more than 2 standard deviations below mean
  maxZScore: 2,     // Scores more than 2 standard deviations above mean
  varianceThreshold: 1.5,  // Maximum acceptable variance
  maxReduction: 0.5,      // Maximum 50% reduction for extreme outliers (>3 std dev)
  moderateReduction: 0.75, // 25% reduction for moderate outliers (2-3 std dev)
  // New thresholds for improved outlier detection
  minSampleSize: 3,       // Minimum samples needed for outlier detection
  relationshipMinSamples: 2, // Minimum samples per relationship type
  iqrMultiplier: 1.5,    // IQR multiplier for boxplot method
  contextualThresholds: {
    technical: { min: 1.5, max: 5.0 },   // Technical skills rarely below 1.5
    leadership: { min: 1.0, max: 5.0 },  // Leadership can have wider range
    collaboration: { min: 2.0, max: 5.0 } // Collaboration rarely very low
  },
  // Confidence impact on outlier detection
  confidenceWeights: {
    high: 1.0,    // Full weight for high confidence scores
    medium: 0.85, // Slightly reduced weight for medium confidence
    low: 0.7      // More reduced weight for low confidence scores
  }
} as const; 