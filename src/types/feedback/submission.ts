import { BaseFeedbackContent } from './base';

interface Employee {
  id: string;
  name: string;
  role: string;
}

interface ReviewCycle {
  id: string;
  title: string;
  review_by_date: string;
  status: string;
}

export interface FeedbackResponse extends BaseFeedbackContent {
  id: string;
  feedback_request_id: string;
  session_id: string | null;
  submitted_at: string | null;
  previous_version_id?: string;
}

export interface SubmissionOptions {
  feedbackRequestId: string;
  uniqueLink: string;
  sessionId: string;
  draftId?: string;
}

export interface FeedbackRequest {
  id: string;
  review_cycle_id: string;
  employee_id: string;
  status: string;
  unique_link: string;
  target_responses: number;
  feedback?: FeedbackResponse[];
  employee: Employee;
  review_cycle: ReviewCycle;
} 