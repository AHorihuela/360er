import { type Employee } from './submission';
import { type RelationshipType, type FeedbackStatus } from './base';
import { type FeedbackResponse } from '@/types/feedback';
import { type FeedbackRequest } from '@/types/review';

export interface DashboardEmployee {
  id: string;
  name: string;
  role: string;
  user_id: string;
  completed_reviews: number;
  total_reviews: number;
}

export interface DashboardEmployeeReference {
  id: string;
  name: string;
  role: string;
}

export interface DashboardFeedbackResponse {
  id: string;
  status: FeedbackStatus;
  submitted_at: string;
  relationship: RelationshipType;
  strengths: string | null;
  areas_for_improvement: string | null;
  feedback_request_id: string;
  employee?: DashboardEmployeeReference;
  responses?: Record<string, number | string>;
}

export interface DashboardCompetency {
  name: string;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  description: string;
  evidenceCount: number;
  evidenceQuotes?: string[];
}

export interface DashboardFeedbackRequest {
  id: string;
  employee_id: string;
  review_cycle_id: string;
  status: string;
  target_responses: number;
  unique_link: string | null;
  created_at?: string;
  employee?: Employee;
  feedback_responses?: FeedbackResponse[];
  analytics?: {
    id: string;
    insights: Array<{
      competencies: Array<DashboardCompetency>;
      relationship: string;
    }>;
  };
  _count?: {
    responses: number;
  };
}

export interface DashboardReviewCycle {
  id: string;
  title: string;
  review_by_date: string;
  feedback_requests: DashboardFeedbackRequest[];
}

export interface ReviewCycleWithFeedback extends DashboardReviewCycle {
  total_requests: number;
  completed_requests: number;
}

// Input type for review cycle data processing
export interface ReviewCycleInput {
  id: string;
  title: string;
  review_by_date: string;
  feedback_requests?: Array<FeedbackRequest & {
    feedback_responses?: FeedbackResponse[];
    analytics?: {
      id: string;
      insights: Array<{
        competencies: Array<DashboardCompetency>;
        relationship: string;
      }>;
    };
  }>;
}

// Result type for feedback mapping operations
export interface MapFeedbackResult {
  mappedRequests: DashboardFeedbackRequest[];
  totalRequests: number;
  completedRequests: number;
  employeesWithStatus: DashboardEmployee[] | undefined;
} 