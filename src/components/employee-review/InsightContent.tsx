import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CORE_COMPETENCIES } from "@/lib/competencies";
import { cn } from '@/lib/utils';
import { type RelationshipInsight } from "@/types/feedback/analysis";

interface Props {
  insight: RelationshipInsight | undefined;
}

interface CompetencyDetail {
  name: string;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  description: string;
  evidenceCount: number;
  roleSpecificNotes: string;
  details?: {
    name: string;
    aspects: readonly string[];
    rubric: Readonly<Record<number, string>>;
  };
}

export function InsightContent({ insight }: Props) {
  if (!insight) {
    return (
      <div className="text-sm text-muted-foreground italic text-center">
        No insights available yet
      </div>
    );
  }
  
  // Add default values and null checks
  const isAggregate = insight?.relationship === 'aggregate';
  
  // For aggregate view
  const themes = insight?.themes || [];
  
  // Memoize competency lookups
  const competencyDetails = useMemo(() => 
    insight.competencies?.map((score) => ({
      ...score,
      details: Object.entries(CORE_COMPETENCIES).find(([_, comp]) => 
        comp.name === score.name
      )?.[1],
    })) || [],
    [insight.competencies]
  );

  return (
    <>
      {/* Key Themes and Unique Insights in a grid */}
      <div className="grid grid-cols-2 gap-8">
        {/* Key Themes Column */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Key Themes</h4>
          <div className="grid gap-2">
            {themes.map((theme: string, i: number) => (
              <div key={i} className="text-sm text-muted-foreground">
                • {theme}
              </div>
            ))}
            {themes.length === 0 && (
              <div className="text-sm text-muted-foreground italic">
                No themes identified yet
              </div>
            )}
          </div>
        </div>

        {/* Areas for Improvement Column */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Unique Perspectives</h4>
          <div className="grid gap-2">
            {(insight.uniquePerspectives || []).map((perspective: string, i: number) => (
              <div key={i} className="text-sm text-muted-foreground">
                • {perspective}
              </div>
            ))}
            {(!insight.uniquePerspectives || insight.uniquePerspectives.length === 0) && (
              <div className="text-sm text-muted-foreground italic">
                No unique perspectives identified yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Competencies */}
      <div className="space-y-4 mt-8">
        <h4 className="text-sm font-medium">Competency Assessment</h4>
        {competencyDetails.length > 0 ? (
          competencyDetails.map(({ details, ...competency }: CompetencyDetail, i: number) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{competency.name}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="cursor-help">
                        <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent side="right" align="start" className="max-w-[280px] p-3">
                        <div className="space-y-2">
                          <div>
                            <p className="font-medium mb-1">Score Components:</p>
                            <div className="flex items-center gap-2 mb-1">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                competency.confidence === 'low' ? "bg-destructive/50" :
                                competency.confidence === 'medium' ? "bg-yellow-500" :
                                "bg-primary"
                              )} />
                              <p className="text-sm capitalize">{competency.confidence} Confidence</p>
                            </div>
                          </div>
                          {details && (
                            <>
                              <div>
                                <p className="font-medium mb-1">Key Aspects:</p>
                                <div className="grid gap-1">
                                  {details.aspects.map((aspect: string, i: number) => (
                                    <div key={i} className="flex items-baseline gap-2 text-sm">
                                      <div className="w-1 h-1 rounded-full bg-primary/50 mt-1.5" />
                                      <span>{aspect}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="font-medium mb-1">Score Meaning ({competency.score}/5):</p>
                                <p className="text-sm">
                                  {details.rubric[competency.score as keyof typeof details.rubric]}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge 
                          variant={competency.confidence === 'low' ? 'destructive' : 
                                 competency.confidence === 'medium' ? 'outline' : 
                                 'secondary'}
                          className={cn(
                            "text-xs capitalize cursor-help",
                            competency.confidence === 'medium' && "bg-yellow-50 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-700",
                            competency.confidence === 'high' && "bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700"
                          )}
                        >
                          {competency.confidence}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="center" className="p-2">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Confidence Level</p>
                          <p className="text-sm text-muted-foreground">
                            {competency.confidence === 'low' ? 'Based on 0-2 reviewers providing specific evidence' :
                             competency.confidence === 'medium' ? 'Based on 2-3 reviewers providing specific evidence' :
                             'Based on 4+ reviewers providing specific evidence'}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="font-medium w-8 text-right">{competency.score}/5</span>
                </div>
              </div>
              <div className="relative">
                <Progress 
                  value={(competency.score / 5) * 100} 
                  className={cn(
                    "h-2",
                    competency.confidence === 'low' ? "bg-destructive/10 [&>div]:bg-destructive/50" :
                    competency.confidence === 'medium' ? "bg-yellow-100 [&>div]:bg-yellow-500" :
                    "bg-primary/10 [&>div]:bg-primary"
                  )}
                />
                <div className="absolute inset-0 grid grid-cols-5 -mx-[1px]">
                  {[1,2,3,4,5].map(n => (
                    <div key={n} className="border-l border-muted last:border-r" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{competency.description}</p>
              {competency.roleSpecificNotes && (
                <p className="text-sm text-muted-foreground italic mt-1">{competency.roleSpecificNotes}</p>
              )}
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground italic">
            No competency assessments available yet
          </div>
        )}
      </div>
    </>
  );
} 