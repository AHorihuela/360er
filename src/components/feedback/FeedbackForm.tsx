import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { validateFeedback } from '@/utils/feedbackValidation';
import { FeedbackFormData, FeedbackFormProps, ValidationState, ValidationFieldState } from '@/types/feedback/form';
import { RelationshipType } from '@/types/feedback/base';

export function FeedbackForm({
  employeeName,
  employeeRole,
  showNames,
  formData,
  onFormDataChange,
  onSubmit,
  isSubmitting
}: FeedbackFormProps) {
  const [showLengthRequirements, setShowLengthRequirements] = useState(false);
  const [validation, setValidation] = useState<ValidationState>({
    strengths: { isValid: true, message: '', showLengthWarning: false },
    areas_for_improvement: { isValid: true, message: '', showLengthWarning: false }
  });

  // Update validation effect
  useEffect(() => {
    setValidation({
      strengths: validateFeedback(formData.strengths, showLengthRequirements),
      areas_for_improvement: validateFeedback(formData.areas_for_improvement, showLengthRequirements)
    });
  }, [formData.strengths, formData.areas_for_improvement, showLengthRequirements]);

  const displayName = showNames ? employeeName : 'Employee';

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submit triggered');
    
    // Check if validation passes before submitting
    const isValid = validation.strengths.isValid && validation.areas_for_improvement.isValid;
    if (!isValid) {
      console.log('Validation failed:', validation);
      setShowLengthRequirements(true);
      return;
    }

    if (isSubmitting) {
      console.log('Already submitting, preventing duplicate submission');
      return;
    }

    // Disable the form temporarily to prevent double submission
    const submitButton = (e.target as HTMLFormElement).querySelector('button[type="submit"]') as HTMLButtonElement;
    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      await onSubmit(e);
    } finally {
      // Re-enable the button after submission attempt
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <div className="space-y-3">
        <label className="text-base sm:text-lg font-medium">
          Your relationship to {showNames ? employeeName : 'the reviewee'}
        </label>
        <ToggleGroup 
          type="single" 
          value={formData.relationship}
          onValueChange={(value: string) => {
            if (value) {
              onFormDataChange({
                ...formData,
                relationship: value as RelationshipType
              });
            }
          }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3"
        >
          <ToggleGroupItem 
            value="senior_colleague" 
            className="group relative flex h-[72px] sm:h-[88px] flex-col items-center justify-center rounded-xl border bg-background px-4 sm:px-6 py-2 sm:py-3 shadow-sm outline-none transition-all hover:bg-accent/5 data-[state=on]:border-transparent data-[state=on]:bg-[#6366f1] data-[state=on]:text-white"
          >
            <span className="text-sm sm:text-base font-medium">Senior Colleague</span>
            <span className="mt-1 text-xs sm:text-sm text-muted-foreground group-data-[state=on]:text-white/80">I am more senior</span>
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="equal_colleague" 
            className="group relative flex h-[72px] sm:h-[88px] flex-col items-center justify-center rounded-xl border bg-background px-4 sm:px-6 py-2 sm:py-3 shadow-sm outline-none transition-all hover:bg-accent/5 data-[state=on]:border-transparent data-[state=on]:bg-[#6366f1] data-[state=on]:text-white"
          >
            <span className="text-sm sm:text-base font-medium">Equal Colleague</span>
            <span className="mt-1 text-xs sm:text-sm text-muted-foreground group-data-[state=on]:text-white/80">I am at the same level</span>
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="junior_colleague" 
            className="group relative flex h-[72px] sm:h-[88px] flex-col items-center justify-center rounded-xl border bg-background px-4 sm:px-6 py-2 sm:py-3 shadow-sm outline-none transition-all hover:bg-accent/5 data-[state=on]:border-transparent data-[state=on]:bg-[#6366f1] data-[state=on]:text-white"
          >
            <span className="text-sm sm:text-base font-medium">Junior Colleague</span>
            <span className="mt-1 text-xs sm:text-sm text-muted-foreground group-data-[state=on]:text-white/80">I am less senior</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="space-y-2">
        <label className="block text-base sm:text-lg font-medium">Strengths</label>
        <div className="space-y-1">
          <textarea
            className={`min-h-[120px] w-full rounded-lg border ${
              !validation.strengths.isValid && validation.strengths.showLengthWarning
                ? 'border-red-500'
                : validation.strengths.isValid && formData.strengths.length > 0
                ? validation.strengths.warnings?.length ? 'border-yellow-500' : 'border-green-500'
                : 'border-input'
            } bg-background px-3 py-2 text-sm sm:text-base`}
            value={formData.strengths}
            onChange={(e) => onFormDataChange({ ...formData, strengths: e.target.value })}
            placeholder={`What does ${displayName} do well? What are their key strengths?`}
            required
          />
          <div className="space-y-1">
            {validation.strengths.showLengthWarning && (
              <p className={`text-xs sm:text-sm ${
                !validation.strengths.isValid ? 'text-red-500' : 'text-muted-foreground'
              }`}>
                {validation.strengths.message}
              </p>
            )}
            {validation.strengths.warnings?.map((warning, index) => (
              <p key={index} className="text-xs sm:text-sm text-yellow-500">
                ⚠️ {warning}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-base sm:text-lg font-medium">Areas for Improvement</label>
        <div className="space-y-1">
          <textarea
            className={`min-h-[120px] w-full rounded-lg border ${
              !validation.areas_for_improvement.isValid && validation.areas_for_improvement.showLengthWarning
                ? 'border-red-500'
                : validation.areas_for_improvement.isValid && formData.areas_for_improvement.length > 0
                ? validation.areas_for_improvement.warnings?.length ? 'border-yellow-500' : 'border-green-500'
                : 'border-input'
            } bg-background px-3 py-2 text-sm sm:text-base`}
            value={formData.areas_for_improvement}
            onChange={(e) => onFormDataChange({ ...formData, areas_for_improvement: e.target.value })}
            placeholder={`What could ${displayName} improve? What suggestions do you have for their development?`}
            required
          />
          <div className="space-y-1">
            {validation.areas_for_improvement.showLengthWarning && (
              <p className={`text-xs sm:text-sm ${
                !validation.areas_for_improvement.isValid ? 'text-red-500' : 'text-muted-foreground'
              }`}>
                {validation.areas_for_improvement.message}
              </p>
            )}
            {validation.areas_for_improvement.warnings?.map((warning, index) => (
              <p key={index} className="text-xs sm:text-sm text-yellow-500">
                ⚠️ {warning}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button 
          type="submit" 
          className="w-full sm:w-auto"
          disabled={
            isSubmitting || 
            (showLengthRequirements && (!validation.strengths.isValid || !validation.areas_for_improvement.isValid))
          }
        >
          {isSubmitting ? 'Submitting...' : 'Review Feedback'}
        </Button>
      </div>
    </form>
  );
} 