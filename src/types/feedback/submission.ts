import { CoreFeedbackResponse } from './base';

export interface Employee {
  id: string;
  name: string;
  role: string;
}

export interface ReviewCycle {
  id: string;
  title: string;
  review_by_date: string;
  status: string;
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
  feedback?: CoreFeedbackResponse[];
  employee: Employee;
  review_cycle: ReviewCycle;
} 