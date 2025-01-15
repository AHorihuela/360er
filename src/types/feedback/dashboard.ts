import { RelationshipType, FeedbackStatus } from './base';

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
}

export interface DashboardFeedbackRequest {
  id: string;
  employee_id: string;
  status: string;
  target_responses: number;
  unique_link: string;
  feedback_responses?: DashboardFeedbackResponse[];
  employee?: DashboardEmployeeReference;
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