import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HelpCircle, Info } from 'lucide-react';
import { ReviewCycleType } from '@/types/survey';
import { surveyTypeInfo } from './surveyTypeConfig';

interface SurveyTypeSelectorProps {
  selectedType: ReviewCycleType;
  onTypeChange: (type: ReviewCycleType) => void;
}

export function SurveyTypeSelector({ selectedType, onTypeChange }: SurveyTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium" htmlFor="survey-type">
          Survey Type
        </label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5">
                <HelpCircle className="h-4 w-4" />
                <span className="sr-only">Survey type info</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">Choose the type of feedback collection that fits your needs.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <RadioGroup
        defaultValue={selectedType}
        value={selectedType}
        onValueChange={(value) => onTypeChange(value as ReviewCycleType)}
        className="grid grid-cols-1 gap-3"
      >
        {(Object.keys(surveyTypeInfo) as ReviewCycleType[]).map((type) => {
          const config = surveyTypeInfo[type];
          const IconComponent = config.icon;
          
          return (
            <div key={type} className="relative">
              <RadioGroupItem
                value={type}
                id={`survey-type-${type}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`survey-type-${type}`}
                className={`flex cursor-pointer items-center justify-between rounded-lg border-2 p-4 transition-all ${config.color} peer-data-[state=checked]:border-primary peer-data-[state=checked]:shadow-sm`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                    <IconComponent className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{config.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {config.badge}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                </div>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Info className="h-4 w-4" />
                      <span className="sr-only">View sample questions</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Sample Questions</h4>
                      <div className="space-y-2">
                        {config.questions.map((question, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                            <p className="text-sm text-muted-foreground leading-relaxed">{question}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
} 