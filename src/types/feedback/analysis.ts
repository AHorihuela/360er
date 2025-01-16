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

export interface CompetencyScore {
  name: string;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  description: string;
  evidenceCount: number;
  roleSpecificNotes: string;
  evidenceQuotes?: string[];
}

export interface Competency extends Omit<CompetencyScore, 'name' | 'description'> {
  dimension: string;
  evidence: string;
}

interface BaseInsight {
  relationship: string;
}

export interface AggregateInsight extends BaseInsight {
  relationship: 'aggregate';
  themes: string[];
  competencies: CompetencyScore[];
  responseCount: number;
  uniquePerspectives: string[];
}

export interface PerspectiveInsight extends BaseInsight {
  relationship: 'senior' | 'peer' | 'junior';
  themes: string[];
  competencies: CompetencyScore[];
  responseCount: number;
  uniquePerspectives: string[];
}

export type RelationshipInsight = AggregateInsight | PerspectiveInsight;

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

// OpenAI API Response Types
export interface OpenAICompetencyScore {
  name: string;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  description: string;
  evidenceCount: number;
  evidenceQuotes?: string[];
}

export interface OpenAIAggregateSection {
  themes: string[];
  competency_scores?: OpenAICompetencyScore[];
}

export interface OpenAIPerspectiveSection {
  key_insights: string[];
  competency_scores?: OpenAICompetencyScore[];
}

export interface OpenAIAnalysisResponse {
  aggregate: OpenAIAggregateSection;
  senior: OpenAIPerspectiveSection;
  peer: OpenAIPerspectiveSection;
  junior: OpenAIPerspectiveSection;
} 