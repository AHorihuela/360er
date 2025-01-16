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

export interface ScoreWithOutlier {
  name: string;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  evidenceCount: number;
  description: string;
  relationship: string;
  reviewerId?: string;
  hasOutliers?: boolean;
  adjustedWeight?: number;
  evidenceQuotes?: string[];
  adjustmentDetails?: Array<{
    originalScore: number;
    adjustmentType: 'extreme' | 'moderate';
    relationship: string;
  }>;
  aspectScores?: AspectScore[];
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
}

export interface AggregateScore {
  name: string;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  evidenceCount: number;
  hasOutliers?: boolean;
  evidenceQuotes?: string[];
} 