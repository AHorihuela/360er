export interface ReviewCycle {
  id: string;
  title: string;
  review_by_date: string;
  status: 'active' | 'completed';
  created_at: string;
  user_id: string;
  _count?: {
    feedback_requests?: number;
    completed_feedback?: number;
    total_feedback?: number;
    pending_feedback?: number;
  }
}

export interface FeedbackRequest {
  id: string;
  review_cycle_id: string;
  employee_id: string;
  unique_link: string;
  status: 'pending' | 'completed';
  created_at: string;
  employee?: {
    id: string;
    name: string;
    role: string;
  };
  feedback?: FeedbackResponse[];
}

export interface FeedbackResponse {
  id: string;
  relationship: 'senior_colleague' | 'equal_colleague' | 'junior_colleague';
  strengths: string | null;
  areas_for_improvement: string | null;
  overall_rating: number;
  submitted_at: string;
  feedback_request_id: string;
}

export interface CreateReviewCycleInput {
  title: string;
  review_by_date: string;
  user_id: string;
  status?: 'active' | 'completed';
} 