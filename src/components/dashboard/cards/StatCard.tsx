import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | JSX.Element;
  subtitle: string;
  progress?: {
    value: number;
    className?: string;
  };
  tooltip?: {
    content: JSX.Element;
  };
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  progress, 
  tooltip 
}: StatCardProps) {
  return (
    <div className="p-4 border rounded-lg bg-slate-50">
      <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
        {title}
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[300px] p-3">
                {tooltip.content}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="text-2xl font-semibold flex items-center gap-2">
        {value}
      </div>
      <div className="text-sm text-muted-foreground">{subtitle}</div>
      {progress && (
        <Progress 
          value={progress.value} 
          className={cn("h-1 mt-2", progress.className)}
        />
      )}
    </div>
  );
} 