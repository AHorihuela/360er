// Common types used across the feedback domain

export type RelationshipType = 'senior_colleague' | 'equal_colleague' | 'junior_colleague';

export type FeedbackStatus = 'in_progress' | 'submitted';

export type FeedbackStep = 'form' | 'ai_review' | 'submitting';

export interface BaseFeedbackContent {
  relationship: RelationshipType;
  strengths: string | null;
  areas_for_improvement: string | null;
}

export interface TimestampedEntity {
  created_at?: string;
  updated_at?: string;
}

export interface BaseEntity {
  id: string;
  status: string;
}

// Core feedback response that all other feedback responses extend
export interface CoreFeedbackResponse extends BaseFeedbackContent, BaseEntity {
  feedback_request_id: string;
  session_id?: string | null;
  submitted_at: string | null;
  previous_version_id?: string | null;
  status: FeedbackStatus;
  created_at?: string;
  updated_at?: string;
}

// Type aliases for different contexts
export type SubmissionFeedbackResponse = CoreFeedbackResponse;
export type DashboardFeedbackResponse = CoreFeedbackResponse & {
  employee?: {
    id: string;
    name: string;
    role: string;
  };
};
export type AnalyticsFeedbackResponse = CoreFeedbackResponse; 