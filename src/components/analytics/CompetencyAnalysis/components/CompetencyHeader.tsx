import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CompetencyHeaderProps {
  title: string;
  hasInsufficientData: boolean;
}

export function CompetencyHeader({ title, hasInsufficientData }: CompetencyHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      {hasInsufficientData && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-amber-600 text-sm bg-amber-50/50 px-2 py-0.5 rounded">
                <Info className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">Filtered view active</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[200px]">
              <div className="flex items-start gap-2 p-2">
                <Info className="h-4 w-4 mt-0.5 text-amber-600" />
                <p className="leading-snug">Some competencies are hidden due to insufficient data for the selected filters</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
} 