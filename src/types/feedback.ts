export interface Competency {
  name: string;
  score: number;
  confidence: 'low' | 'medium' | 'high';
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

export interface FeedbackResponse {
  id: string;
  relationship: string;
  strengths: string | null;
  areas_for_improvement: string | null;
  submitted_at: string;
} 