import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Competency } from '@/lib/competencies';
import { ScoreWithOutlier } from '../types';

interface LevelAndGrowthProps {
  score: ScoreWithOutlier;
  competency: Competency | null;
}

export function LevelAndGrowth({ score, competency }: LevelAndGrowthProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="p-6 bg-background rounded-lg border relative overflow-hidden cursor-help">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
              <div className="mb-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Current Level</div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold text-blue-500">Level {Math.floor(score.score)}</h3>
                  <div className="text-sm text-muted-foreground">of 5</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {competency?.rubric[Math.floor(score.score)] || "Score description not available"}
              </p>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>Your current performance level based on aggregated feedback. Each level represents a distinct stage of competency development, from basic proficiency (Level 1) to exceptional mastery (Level 5).</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {score.score < 5.0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-6 bg-background rounded-lg border relative overflow-hidden cursor-help">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                <div className="mb-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Next Level Target</div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-semibold text-emerald-500">Level {Math.floor(score.score) + 1}</h3>
                    <div className="text-sm text-muted-foreground">of 5</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {competency?.rubric[Math.floor(score.score) + 1] || "Score description not available"}
                </p>
                <div className="mt-4">
                  <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-blue-500">Current</span>
                      <span>Level {Math.floor(score.score)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-emerald-500">Target</span>
                      <span>Level {Math.floor(score.score) + 1}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ 
                          width: `${Math.min(((score.score - Math.floor(score.score)) * 100), 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-end">
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        {Math.round((score.score - Math.floor(score.score)) * 100)}% progress to Level {Math.floor(score.score) + 1}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Your next development target with a progress indicator showing how close you are to reaching the next level. The progress bar shows your advancement within your current level.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
} 