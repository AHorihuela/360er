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
    <div className="space-y-6">
      <h3 className="text-lg sm:text-xl font-medium mb-4">
        {questionText} {required && <span className="text-red-500">*</span>}
      </h3>
      
      <RadioGroup 
        value={value?.toString()} 
        onValueChange={(val) => onChange(parseInt(val, 10))}
        className="grid grid-cols-5 gap-2"
      >
        {safeOptions.map((option) => {
          const isSelected = value?.toString() === option.value.toString();
          
          return (
            <div key={option.value} className="group">
              <RadioGroupItem
                value={option.value.toString()}
                id={`${id}-${option.value}`}
                className="sr-only peer"
              />
              
              <Label 
                htmlFor={`${id}-${option.value}`}
                className="flex flex-col items-center justify-center cursor-pointer py-3 px-2 rounded-md hover:bg-accent/20 peer-data-[state=checked]:bg-accent/30 transition-colors h-full min-h-24"
              >
                {/* Custom radio indicator */}
                <div className="mb-3">
                  <div 
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${isSelected ? 'border-primary bg-primary' : 'border-gray-300 group-hover:border-gray-400'}`}
                  >
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                  </div>
                </div>
                
                {/* Option label */}
                <div className="text-center">
                  <span className={`text-xs sm:text-sm ${isSelected ? 'text-foreground font-medium' : 'text-muted-foreground group-hover:text-foreground'}`}>
                    {option.label}
                  </span>
                </div>
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
} 