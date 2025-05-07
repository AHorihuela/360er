// Type definitions for survey-related functionality
import { TimestampValidation } from './review';

// Types of review cycles
export type ReviewCycleType = '360_review' | 'manager_effectiveness';

// Question types for surveys
export type QuestionType = 'likert' | 'open_ended' | 'multiple_choice';

// Base interface for a survey question option
export interface QuestionOption {
  value: number | string;
  label: string;
}

// Interface for a survey question
export interface SurveyQuestion extends TimestampValidation {
  id: string;
  reviewCycleType: ReviewCycleType;
  questionText: string;
  questionType: QuestionType;
  options?: QuestionOption[];
  order: number;
}

// Interface for structured survey responses
export type StructuredResponses = Record<string, string | number>;

// Analytics for Likert scale questions
export interface LikertAnalytics {
  questionId: string;
  questionText: string;
  averageScore: number;
  responseCount: number;
  distribution: Record<number, number>; // score -> count
}

// For Manager Effectiveness Survey report
export interface ManagerEffectivenessReport {
  managerName: string;
  overallScore: number;
  responseCount: number;
  questionScores: {
    questionId: string;
    questionText: string;
    score: number;
    distribution: Record<number, number>;
  }[];
  openEndedResponses: {
    questionId: string;
    questionText: string;
    responses: string[];
  }[];
  recommendations?: string[];
}

// Form state for Manager Effectiveness Survey
export interface ManagerSurveyFormState {
  feedbackRequestId: string;
  employeeName: string;
  employeeRole: string;
  relationship: string;
  responses: StructuredResponses;
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
  isComplete: boolean;
} 