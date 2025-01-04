import { RelationshipType, FeedbackStep } from './base';

// Form data should always have non-null strings
export interface FeedbackFormData {
  relationship: RelationshipType;
  strengths: string;
  areas_for_improvement: string;
}

export interface FeedbackFormState {
  step: FeedbackStep;
  aiAnalysisAttempted: boolean;
  draftId?: string;
}

export interface ValidationState {
  strengths: ValidationFieldState;
  areas_for_improvement: ValidationFieldState;
}

export interface ValidationFieldState {
  isValid: boolean;
  message: string;
  warnings?: string[];
  showLengthWarning: boolean;
}

export interface FeedbackFormProps {
  employeeName: string;
  employeeRole: string;
  showNames: boolean;
  formData: FeedbackFormData;
  onFormDataChange: (data: FeedbackFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
} 