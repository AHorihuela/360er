import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Competency } from '@/lib/competencies';

interface AreasOfEvaluationProps {
  competency: Competency | null;
}

export function AreasOfEvaluation({ competency }: AreasOfEvaluationProps) {
  return (
    <div className="rounded-lg border">
      <div className="px-3 py-2 border-b bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-0.5 bg-blue-500 rounded-full" />
            <h3 className="text-sm font-medium">Areas of Evaluation</h3>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help">
                  <p className="text-xs text-muted-foreground">
                    AI-analyzed areas
                  </p>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-2">
                  <p className="text-sm">The AI analyzes feedback responses by:</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• Identifying specific mentions of each area</li>
                    <li>• Evaluating sentiment and context</li>
                    <li>• Weighing evidence by relationship type</li>
                    <li>• Cross-referencing multiple responses</li>
                    <li>• Detecting patterns across feedback</li>
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className="p-2">
        {competency?.aspects && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {competency.aspects.map((aspect, i) => (
              <TooltipProvider key={i}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="flex items-center gap-2 group px-2.5 py-1.5 rounded hover:bg-slate-50 transition-colors cursor-help"
                    >
                      <div className="w-1 h-1 rounded-full bg-blue-500/70 group-hover:bg-blue-500 transition-colors" />
                      <div className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                        {aspect}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium">{aspect}</p>
                      <p className="text-xs text-muted-foreground">
                        AI looks for specific examples, quantifiable achievements, and peer acknowledgments related to {aspect.toLowerCase()}.
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 