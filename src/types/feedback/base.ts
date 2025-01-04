// Common types used across the feedback domain

export type RelationshipType = 'senior_colleague' | 'equal_colleague' | 'junior_colleague';

export type FeedbackStatus = 'in_progress' | 'submitted' | 'superseded';

export type FeedbackStep = 'editing' | 'ai_review' | 'submitting';

export interface BaseFeedbackContent {
  relationship: RelationshipType;
  strengths: string;
  areas_for_improvement: string;
  status: FeedbackStatus;
}

export interface TimestampedEntity {
  created_at?: string;
  updated_at?: string;
  submitted_at?: string;
}

export interface BaseEntity {
  id: string;
  status: string;
}

export interface FeedbackResponse extends BaseFeedbackContent, TimestampedEntity {
  id: string;
}

export interface FeedbackRequest extends TimestampedEntity {
  id: string;
  unique_link: string;
  status: string;
  employee?: {
    name: string;
    role: string;
  };
  feedback?: FeedbackResponse[];
  ai_reports?: Array<{
    content: string;
    updated_at: string;
  }>;
  _count?: {
    target_responses: number;
    responses?: number;
  };
} 