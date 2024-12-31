export interface FeedbackResponse {
  id: string;
  feedback_request_id: string;
  relationship: string;
  strengths: string | null;
  areas_for_improvement: string | null;
  submitted_at: string;
  status: string;
  employee?: {
    id: string;
    name: string;
    role: string;
  };
}

export interface FeedbackRequest {
  id: string;
  employee_id: string;
  review_cycle_id: string;
  unique_link: string | null;
  status: string;
  target_responses: number;
  created_at: string;
  updated_at: string;
  last_analyzed_at?: string;
  employee?: {
    id: string;
    name: string;
    role: string;
  };
  feedback?: FeedbackResponse[];
  _count?: {
    responses: number;
    page_views: number;
    unique_viewers: number;
  };
} 