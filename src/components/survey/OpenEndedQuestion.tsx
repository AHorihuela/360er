import React, { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { validateFeedback } from '@/utils/feedbackValidation';

// Match the ValidationResult interface from feedbackValidation.ts
interface ValidationResult {
  isValid: boolean;
  message: string;
  warnings?: string[];
  showLengthWarning: boolean;
}

interface OpenEndedQuestionProps {
  id: string;
  questionText: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showValidation?: boolean;
  required?: boolean;
  minLength?: number;
}

export function OpenEndedQuestion({
  id,
  questionText,
  value,
  onChange,
  placeholder = 'Share your thoughts...',
  showValidation = false,
  required = true,
  minLength = 30
}: OpenEndedQuestionProps) {
  // Check if this is the last question (additional feedback) which should be optional
  const isLastFeedbackQuestion = questionText.includes('additional feedback you would like to share');
  const isRequired = isLastFeedbackQuestion ? false : required;
  
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
    message: '',
    warnings: [],
    showLengthWarning: false
  });

  // Validate the feedback when the value changes
  useEffect(() => {
    if (isRequired) {
      const result = validateFeedback(value, showValidation);
      setValidation(result);
    } else {
      // For optional questions, always mark as valid
      setValidation({
        isValid: true,
        message: '',
        warnings: [],
        showLengthWarning: false
      });
    }
  }, [value, showValidation, isRequired]);

  return (
    <div className="space-y-3">
      <h3 className="text-lg sm:text-xl font-medium">
        {questionText} {isRequired && <span className="text-red-500">*</span>}
      </h3>
      
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className={`w-full resize-y min-h-[120px] sm:min-h-[150px] ${!validation.isValid && validation.showLengthWarning ? 'border-red-500' : ''}`}
      />
      
      {validation.showLengthWarning && (
        <p className={`text-xs ${
          !validation.isValid ? 'text-red-500' : 'text-muted-foreground'
        }`}>
          {validation.message}
        </p>
      )}
      
      {validation.warnings?.map((warning: string, index: number) => (
        <p key={index} className="text-xs text-yellow-500">
          ⚠️ {warning}
        </p>
      ))}
    </div>
  );
} 