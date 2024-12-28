export interface TimestampValidation {
  created_at: string;
  updated_at?: string;
  submitted_at?: string;
}

export interface ReviewCycle {
  id: string;
  name: string;
  title: string;
  start_date: string;
  end_date: string;
  review_by_date: string;
  status: 'active' | 'completed' | 'draft';
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

export interface FeedbackRequest extends TimestampValidation {
  id: string;
  review_cycle_id: string;
  employee_id: string;
  unique_link: string;
  status: RequestStatus;
  target_responses: number;
  manually_completed: boolean;
  employee?: {
    id: string;
    name: string;
    role: string;
  };
  feedback?: FeedbackResponse[];
  ai_report?: AIReport;
  page_views?: PageView[];
  _count?: {
    page_views: number;
    unique_viewers: number;
    responses: number;
  };
}

export interface FeedbackResponse extends TimestampValidation {
  id: string;
  relationship: 'senior_colleague' | 'equal_colleague' | 'junior_colleague';
  strengths: string | null;
  areas_for_improvement: string | null;
  overall_rating: number;
  feedback_request_id: string;
  submitted_at: string;
}

export interface CreateReviewCycleInput {
  title: string;
  review_by_date: string;
  user_id: string;
  status?: 'active' | 'completed';
}

export interface AIReport extends TimestampValidation {
  id: string;
  feedback_request_id: string;
  content: string;
  is_final: boolean;
  error?: string;
  status?: 'pending' | 'processing' | 'completed' | 'error';
} 