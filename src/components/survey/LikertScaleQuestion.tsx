import React, { useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { QuestionOption } from '@/types/survey';

interface LikertScaleQuestionProps {
  id: string;
  questionText: string;
  options: QuestionOption[];
  value: number | undefined;
  onChange: (value: number) => void;
  required?: boolean;
}

export function LikertScaleQuestion({
  id,
  questionText,
  options,
  value,
  onChange,
  required = true
}: LikertScaleQuestionProps) {
  console.log('LikertScaleQuestion rendering with props:', {
    id,
    questionText,
    options,
    value,
    required
  });
  
  useEffect(() => {
    // Validate options on mount
    if (!options || options.length === 0) {
      console.error('LikertScaleQuestion requires options array', { id, questionText });
    }
  }, [id, questionText, options]);

  // Make sure options is an array
  const safeOptions = Array.isArray(options) ? options : [];
  
  if (safeOptions.length === 0) {
    console.error('No options available for Likert scale question', id);
    return (
      <div className="p-4 border border-red-500 rounded">
        <p>Error: No options available for this question.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg sm:text-xl font-medium mb-2">
        {questionText} {required && <span className="text-red-500">*</span>}
      </h3>
      
      <div className="space-y-2 sm:space-y-4">
        <RadioGroup 
          value={value?.toString()} 
          onValueChange={(val) => onChange(parseInt(val, 10))}
          className="grid grid-cols-5 gap-1"
        >
          {safeOptions.map((option) => {
            const isSelected = value?.toString() === option.value.toString();
            
            return (
              <div key={option.value} className="group">
                {/* The actual radio input for accessibility */}
                <RadioGroupItem
                  value={option.value.toString()}
                  id={`${id}-${option.value}`}
                  className="sr-only peer"
                />
                
                {/* Clickable label with hover and selection states */}
                <Label 
                  htmlFor={`${id}-${option.value}`}
                  className="flex flex-col items-center cursor-pointer pt-2 pb-1 px-1 rounded-sm hover:bg-accent/10 peer-data-[state=checked]:bg-accent/10"
                >
                  {/* Custom radio indicator */}
                  <div 
                    className={`w-4 h-4 rounded-full border flex items-center justify-center mb-2
                      ${isSelected ? 'border-primary bg-primary' : 'border-gray-300 group-hover:border-gray-400'}`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  
                  {/* Option label */}
                  <span className="text-xs text-center text-muted-foreground group-hover:text-foreground peer-data-[state=checked]:text-foreground">
                    {option.label}
                  </span>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>
    </div>
  );
} 