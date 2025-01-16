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
  hasOutliers?: boolean;
  adjustedWeight?: number;
  evidenceQuotes?: string[];
  adjustmentDetails?: Array<{
    originalScore: number;
    adjustmentType: 'extreme' | 'moderate';
    relationship: string;
  }>;
  aspectScores?: AspectScore[];
}

export interface AggregateScore {
  name: string;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  evidenceCount: number;
  hasOutliers?: boolean;
  evidenceQuotes?: string[];
}

// Add COMPETENCY_ORDER type
export const COMPETENCY_ORDER = [
  'Technical/Functional Expertise',
  'Leadership & Influence',
  'Collaboration & Communication',
  'Innovation & Problem-Solving',
  'Execution & Accountability',
  'Emotional Intelligence & Culture Fit',
  'Growth & Development'
] as const; 