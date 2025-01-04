// Common types used across the feedback domain

export type RelationshipType = 'senior_colleague' | 'equal_colleague' | 'junior_colleague';

export type FeedbackStatus = 'in_progress' | 'submitted';

export type FeedbackStep = 'form' | 'ai_review' | 'submitting';

export interface BaseFeedbackContent {
  strengths: string;
  areas_for_improvement: string;
  relationship: string;
}

export interface TimestampedEntity {
  created_at: string;
  updated_at?: string;
}

export interface BaseEntity {
  id: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

// Core feedback response that all other feedback responses extend
export interface CoreFeedbackResponse extends BaseFeedbackContent {
  id: string;
  feedback_request_id: string;
  submitted_at: string | null;
  status: string;
  session_id: string;
  created_at: string;
}

// Type aliases for different contexts
export type FeedbackResponse = CoreFeedbackResponse;
export type SubmissionFeedbackResponse = CoreFeedbackResponse;
export type DashboardFeedbackResponse = CoreFeedbackResponse & {
  employee?: {
    id: string;
    name: string;
    role: string;
  };
};
export type AnalyticsFeedbackResponse = CoreFeedbackResponse; 