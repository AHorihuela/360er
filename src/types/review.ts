export interface TimestampValidation {
  created_at: string;
  updated_at?: string;
  submitted_at?: string;
}

// Import ReviewCycleType from survey.ts
import { ReviewCycleType, StructuredResponses } from './survey';

export interface ReviewCycle {
  id: string;
  name: string;
  title: string;
  start_date: string;
  end_date: string;
  review_by_date: string;
  status: 'active' | 'completed' | 'draft';
  // Add the type field with default '360_review' for backward compatibility
  type: ReviewCycleType;
  created_at: string;
  updated_at: string;
  created_by: string;
  user_id: string;
  feedback_requests?: FeedbackRequest[];
  _count?: {
    feedback_requests: number;
    completed_feedback: number;
  };
}

// Extended ReviewCycle type that includes user information for master account mode
export interface ReviewCycleWithUser extends ReviewCycle {
  users?: {
    email: string;
  };
  userEmail?: string | null;
}

export interface PageView extends TimestampValidation {
  id: string;
  feedback_request_id: string;
  user_id?: string;
  session_id: string;
  page_url: string;
}

export const REQUEST_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  EXCEEDED: 'exceeded'
} as const;

export type RequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS];

export interface RequestValidation {
  target_responses: number;
  actual_responses: number;
  manually_completed: boolean;
  status: RequestStatus;
  review_by_date: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  user_id: string;
}

export interface FeedbackResponse {
  id: string;
  status: string;
  submitted_at: string;
  relationship: string;
  strengths: string | null;
  areas_for_improvement: string | null;
  // Add the responses field for structured survey responses
  responses?: StructuredResponses;
  // New fields from manager feedback migration
  source?: 'web' | 'slack' | 'voice';
  category?: string;
}

export interface FeedbackRequest {
  id: string;
  employee_id: string;
  review_cycle_id: string;
  status: string;
  target_responses: number;
  unique_link: string | null; // Now nullable for manager feedback
  created_at?: string;
  employee?: Employee | Employee[];
  feedback_responses?: FeedbackResponse[];
  review_cycle?: ReviewCycle; // Add this to access the cycle type
  analytics?: {
    id: string;
    insights: Array<{
      competencies: Array<{
        name: string;
        score: number;
        confidence: 'low' | 'medium' | 'high';
        description: string;
        evidenceCount: number;
      }>;
      relationship: string;
    }>;
  };
  _count?: {
    responses: number;
  };
}

export interface CreateReviewCycleInput {
  title: string;
  review_by_date: string;
  user_id: string;
  status?: 'active' | 'completed';
  // Add the type field with default
  type?: ReviewCycleType;
}

export interface AIReport extends TimestampValidation {
  id: string;
  feedback_request_id: string;
  content: string;
  is_final: boolean;
  error?: string;
  status?: 'pending' | 'processing' | 'completed' | 'error';
  // New fields from manager feedback migration
  report_period_start?: string;
  report_period_end?: string;
  time_range_preset?: 'last_week' | 'last_month' | 'last_quarter' | 'custom';
  report_purpose?: string;
  feedback_count?: number;
}

// Manager Feedback Specific Types
export interface ManagerFeedbackEntry {
  id: string;
  feedback_request_id: string;
  relationship: 'manager';
  strengths: string;
  areas_for_improvement: string;
  source: 'web' | 'slack' | 'voice';
  category?: string;
  submitted_at: string;
  created_at: string;
}

export interface TimeRangeSelection {
  preset?: 'last_week' | 'last_month' | 'last_quarter' | 'custom';
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface FeedbackDensityInfo {
  feedbackCount: number;
  qualitySuggestion: 'expand_range' | 'sufficient' | 'too_large';
  suggestedRange?: TimeRangeSelection;
  message: string;
}

export interface ManagerFeedbackReport extends AIReport {
  employee_id: string;
  time_range_preset: 'last_week' | 'last_month' | 'last_quarter' | 'custom';
  report_period_start: string;
  report_period_end: string;
  feedback_count: number;
  report_purpose?: string;
}

export interface CreateManagerFeedbackInput {
  employee_id: string;
  content: string;
  source?: 'web' | 'voice';
  category?: string;
} 