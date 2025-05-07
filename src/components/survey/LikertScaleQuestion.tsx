import React from 'react';
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
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor={id} className="text-base font-medium">
          {questionText}
          {required && <span className="text-primary ml-1">*</span>}
        </Label>
      </div>
      
      <RadioGroup
        id={id}
        value={value?.toString() || undefined}
        onValueChange={(val) => onChange(Number(val))}
        className="grid grid-cols-5 gap-2"
      >
        {options.map((option) => (
          <div key={option.value.toString()} className="flex flex-col items-center space-y-2">
            <RadioGroupItem
              value={option.value.toString()}
              id={`${id}-${option.value}`}
              className="peer sr-only"
            />
            <Label
              htmlFor={`${id}-${option.value}`}
              className="flex h-14 w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 bg-background p-2 hover:bg-accent/10 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-accent/20 text-center"
            >
              <span className="text-xs font-medium">{option.label}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
} 