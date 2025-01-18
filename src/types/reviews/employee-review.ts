import { CoreFeedbackResponse } from '@/types/feedback/base';

export interface ReviewCycle {
  id: string;
  title: string;
  review_by_date: string;
  status: string;
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
  "Generating comprehensive insights...",
  "Preparing final report..."
] as const;

export type GenerationStep = 0 | 1 | 2 | 3;
export type GenerationSteps = readonly [string, string, string, string]; 