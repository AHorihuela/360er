import { DashboardFeedbackRequest } from '@/types/feedback/dashboard';

export interface CompetencyHeatmapProps {
  feedbackRequests: DashboardFeedbackRequest[];
}

export interface AdjustmentDetail {
  originalScore: number;
  adjustmentType: 'moderate' | 'extreme';
  relationship: string;
}

export interface AspectScore {
  name: string;
  score: number;
  evidenceCount: number;
  evidenceQuotes?: string[];
}

export interface ConfidenceMetrics {
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

export interface ScoreWithOutlier {
  name: string;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  description: string;
  evidenceCount: number;
  effectiveEvidenceCount: number;
  relationship: string;
  reviewerId?: string;
  evidenceQuotes?: string[];
  hasOutliers: boolean;
  adjustmentDetails?: AdjustmentDetail[];
  scoreDistribution?: Record<number, number>;
  averageScore?: number;
  scoreSpread?: number;
  adjustedWeight?: number;
  confidenceMetrics?: ConfidenceMetrics;
  relationshipBreakdown?: {
    senior: number;
    peer: number;
    junior: number;
  };
}

export interface AggregateScore {
  name: string;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  evidenceCount: number;
  hasOutliers?: boolean;
  evidenceQuotes?: string[];
  adjustmentDetails?: AdjustmentDetail[];
} 