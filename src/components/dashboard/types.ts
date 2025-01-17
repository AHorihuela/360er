import { DashboardFeedbackRequest } from '@/types/feedback/dashboard';

export interface CompetencyHeatmapProps {
  feedbackRequests: DashboardFeedbackRequest[];
}

export interface AdjustmentDetail {
  originalScore: number;
  adjustmentType: 'extreme' | 'moderate';
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
  evidenceCount: number;
  effectiveEvidenceCount: number;
  relationship: string;
  hasOutliers: boolean;
  adjustmentDetails?: Array<{
    originalScore: number;
    adjustmentType: 'moderate' | 'extreme';
    relationship: string;
  }>;
  description: string;
  confidenceMetrics?: {
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
  };
  relationshipBreakdown?: {
    senior: number;
    peer: number;
    junior: number;
  };
  // Properties for score distribution
  scoreDistribution?: Record<number, number>;
  averageScore?: number;
  scoreSpread?: number;
  // Additional properties needed by the system
  adjustedWeight?: number;
  reviewerId?: string;
  evidenceQuotes?: string[];
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