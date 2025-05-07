import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { validateFeedback } from '@/utils/feedbackValidation';

// Import the ValidationResult interface
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
  required?: boolean;
  minLength?: number;
  showValidation?: boolean;
}

export function OpenEndedQuestion({
  id,
  questionText,
  value,
  onChange,
  placeholder = 'Please provide your detailed feedback...',
  required = true,
  minLength = 30,
  showValidation = false
}: OpenEndedQuestionProps) {
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
    message: '',
    warnings: [],
    showLengthWarning: false
  });

  // Update validation based on input
  useEffect(() => {
    if (value) {
      setValidation(validateFeedback(value, showValidation));
    }
  }, [value, showValidation]);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor={id} className="text-base font-medium">
          {questionText}
          {required && <span className="text-primary ml-1">*</span>}
        </Label>
      </div>
      
      <div className="space-y-1">
        <textarea
          id={id}
          className={`min-h-[160px] w-full rounded-lg border ${
            !validation.isValid && validation.showLengthWarning
              ? 'border-red-500'
              : validation.isValid && value.length > 0
              ? validation.warnings?.length ? 'border-yellow-500' : 'border-green-500'
              : 'border-input'
          } bg-background px-3 py-2 text-sm sm:text-base`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
        />
        
        <div className="space-y-1">
          {validation.showLengthWarning && (
            <p className={`text-xs sm:text-sm ${
              !validation.isValid ? 'text-red-500' : 'text-muted-foreground'
            }`}>
              {validation.message}
            </p>
          )}
          {validation.warnings?.map((warning, index) => (
            <p key={index} className="text-xs sm:text-sm text-yellow-500">
              ⚠️ {warning}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
} 