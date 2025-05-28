import { CoreFeedbackResponse } from '@/types/feedback/base';
import { ReviewCycleType } from '@/types/survey';

export interface ReviewCycle {
  id: string;
  title: string;
  review_by_date: string;
  status: string;
  type: ReviewCycleType;
}

export interface FeedbackRequest {
  id: string;
  unique_link: string;
  status: string;
  target_responses: number;
  employee?: {
    name: string;
    role: string;
  };
  feedback?: CoreFeedbackResponse[];
  ai_reports?: Array<{
    content: string;
    updated_at: string;
  }>;
  _count?: {
    responses: number;
    page_views: number;
    unique_viewers: number;
  };
}

export interface AIReportResponse {
  content: string;
  updated_at: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export interface AIReportType {
  content: string;
  created_at: string;
}

// Generation steps for the UI progress display
export const GENERATION_STEPS = [
  "Analyzing feedback responses...",
  "Identifying key themes and patterns...",
  "Evaluating performance metrics...",
  "Generating charts and visualizations...",
  "Finalizing comprehensive report..."
] as const;

export type GenerationStep = 0 | 1 | 2 | 3 | 4;
export type GenerationSteps = readonly [string, string, string, string, string]; 