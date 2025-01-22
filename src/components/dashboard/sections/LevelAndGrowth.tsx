import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Competency } from '@/lib/competencies';
import { ScoreWithOutlier } from '../types';
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LevelAndGrowthProps {
  score: ScoreWithOutlier;
  competency: Competency | null;
}

type RelationshipType = 'senior' | 'peer' | 'junior';

const RELATIONSHIP_LABELS: Record<RelationshipType, { label: string; color: string }> = {
  senior: { label: 'Senior', color: 'bg-blue-100 text-blue-700' },
  peer: { label: 'Peer', color: 'bg-violet-100 text-violet-700' },
  junior: { label: 'Junior', color: 'bg-amber-100 text-amber-700' }
};

export function LevelAndGrowth({ score, competency }: LevelAndGrowthProps) {
  const currentLevel = Math.floor(score.score);
  const nextLevel = currentLevel < 5 ? currentLevel + 1 : currentLevel;
  const progressToNext = Math.min(((score.score - currentLevel) * 100), 100);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Helper function to get relationship type from evidence index
  const getRelationshipForEvidence = (index: number): RelationshipType | null => {
    if (!score.evidenceQuotes || !score.relationshipBreakdown) return null;
    
    let count = 0;
    for (const type of ['senior', 'peer', 'junior'] as RelationshipType[]) {
      const typeCount = score.relationshipBreakdown[type] || 0;
      if (index < count + typeCount) return type;
      count += typeCount;
    }
    return null;
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="p-6 bg-background rounded-lg border relative">
            {/* Level Progress Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                    <span className="text-blue-500 font-semibold">{currentLevel}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center">
                    <span className="text-emerald-500 font-semibold">{nextLevel}</span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">of 5</div>
              </div>
              {currentLevel < 5 && (
                <div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  {Math.round(progressToNext)}% to Level {nextLevel}
                </div>
              )}
            </div>

            {/* Current Level Description */}
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-1.5">Current Level {currentLevel}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {competency?.rubric[currentLevel] || "Score description not available"}
                </p>
              </div>

              {/* Progress Bar */}
              {currentLevel < 5 && (
                <div className="space-y-1.5">
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${progressToNext}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Supporting Evidence */}
              {score.evidenceQuotes && score.evidenceQuotes.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Supporting Quotes from Reviews</div>
                    {score.evidenceQuotes.length > 2 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-xs"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsExpanded(!isExpanded);
                        }}
                      >
                        <span className="mr-1">{isExpanded ? 'Show Less' : 'Show All'}</span>
                        <ChevronDown className={cn(
                          "h-3.5 w-3.5 transition-transform duration-200",
                          isExpanded && "transform rotate-180"
                        )} />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {score.evidenceQuotes
                      .slice(0, isExpanded ? undefined : 2)
                      .map((quote, i) => {
                        const relationship = getRelationshipForEvidence(i);
                        const relationshipInfo = relationship ? RELATIONSHIP_LABELS[relationship] : null;
                        
                        return (
                          <div key={i} className="flex gap-2 items-start group">
                            <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                            <div>
                              <div className="flex items-start gap-2">
                                <div className="text-sm text-muted-foreground flex-1">{quote}</div>
                                {relationshipInfo && (
                                  <Badge 
                                    variant="secondary" 
                                    className={cn(
                                      "text-[10px] px-1.5 py-0.5 font-normal shrink-0 mt-0.5",
                                      relationshipInfo.color
                                    )}
                                  >
                                    {relationshipInfo.label}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>Your current performance level and progress toward the next level, based on aggregated feedback.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 