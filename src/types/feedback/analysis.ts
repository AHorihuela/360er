import { BaseEntity, TimestampedEntity } from './base';

export type AnalysisQuality = 'excellent' | 'good' | 'needs_improvement';
export type SuggestionType = 'critical' | 'enhancement';
export type SuggestionCategory = 'clarity' | 'specificity' | 'actionability' | 'tone' | 'completeness';
export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type AIReportStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface AiFeedbackSuggestion {
  type: SuggestionType;
  category: SuggestionCategory;
  suggestion: string;
  context?: string;
  highlightStart?: string;
  highlightEnd?: string;
}

export interface AiFeedbackResponse {
  overallQuality: AnalysisQuality;
  suggestions: AiFeedbackSuggestion[];
  summary: string;
}

export interface Competency {
  name: string;
  score: number;
  confidence: ConfidenceLevel;
  description: string;
  roleSpecificNotes?: string;
  evidenceCount?: number;
  evidenceQuotes?: string[];
  scoreJustification?: string;
  isInsufficientData?: boolean;
}

export interface RelationshipInsight {
  relationship: string;
  themes: string[];
  uniquePerspectives: string[];
  competencies: Competency[];
  responseCount?: number;
}

export interface AnalyticsMetadata {
  insights: RelationshipInsight[];
  feedback_hash: string;
  last_analyzed_at: string;
}

export interface AIReport extends Omit<BaseEntity, 'status'>, TimestampedEntity {
  feedback_request_id: string;
  content: string;
  is_final: boolean;
  error?: string;
  status?: AIReportStatus;
}

export interface AnalysisStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
} 