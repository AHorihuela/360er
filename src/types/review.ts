export interface ReviewCycle {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed';
  created_at: string;
  created_by: string;
}

export interface FeedbackRequest {
  id: string;
  review_cycle_id: string;
  employee_id: string;
  unique_link: string;
  status: 'pending' | 'completed';
  created_at: string;
}

export interface FeedbackResponse {
  id: string;
  feedback_request_id: string;
  relationship: 'peer' | 'manager' | 'direct_report';
  strengths: string | null;
  areas_for_improvement: string | null;
  overall_rating: number;
  submitted_at: string;
}

export interface CreateReviewCycleInput {
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  employees: string[]; // Array of employee IDs
} 