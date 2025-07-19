import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from '@/components/ui/button';
import { CORE_COMPETENCIES } from "@/lib/competencies";
import { cn } from '@/lib/utils';
import { type RelationshipInsight } from "@/types/feedback/analysis";

function formatScore(score: number | undefined, showPrecision: boolean = false): string {
  if (score === undefined || score === null) return "N/A";
  return showPrecision ? score.toFixed(1) : Math.round(score).toString();
}

interface Props {
  insight: RelationshipInsight | undefined;
}

interface CompetencyDetail {
  name: string;
  score?: number;
  confidence?: 'low' | 'medium' | 'high';
  description: string;
  evidenceCount?: number;
  effectiveEvidenceCount?: number;
  roleSpecificNotes?: string;
  evidenceQuotes?: string[];
  details?: {
    name: string;
    aspects: readonly string[];
    rubric: Readonly<Record<number, string>>;
  };
  hasScore: boolean;
}

export function InsightContent({ insight }: Props) {
  if (!insight) {
    return (
      <div className="text-sm text-muted-foreground italic text-center">
        No insights available yet
      </div>
    );
  }
  
  // For aggregate view
  const themes = insight?.themes ?? [];
  
  // Create a mapping of AI competency names to simplified names
  const competencyNameMapping: Record<string, string> = {
    'Communication': 'Collaboration & Communication',
    'Technical Skills': 'Technical/Functional Expertise', 
    'Collaboration': 'Collaboration & Communication',
    'Leadership': 'Leadership & Influence',
    'Initiative': 'Innovation & Problem-Solving',
    'Initiative & Innovation': 'Innovation & Problem-Solving',
    'Problem Solving': 'Innovation & Problem-Solving',
    'Adaptability': 'Growth & Development'
  };

  // Memoize competency lookups - show ALL core competencies
  const competencyDetails = useMemo(() => {
    const aiCompetencies = insight.competencies || [];
    
    return Object.entries(CORE_COMPETENCIES).map(([key, competencyDef]) => {
      // Try to find a matching AI competency score
      const aiCompetency = aiCompetencies.find(comp => {
        // Direct match first
        if (comp.name === competencyDef.name) return true;
        // Check if any AI competency maps to this core competency
        return competencyNameMapping[comp.name] === competencyDef.name;
      });

      return {
        name: competencyDef.name,
        score: aiCompetency?.score,
        confidence: aiCompetency?.confidence || 'low',
        description: aiCompetency?.description || '',
        evidenceCount: aiCompetency?.evidenceCount || 0,
        roleSpecificNotes: aiCompetency?.roleSpecificNotes || '',
        evidenceQuotes: aiCompetency?.evidence ? [aiCompetency.evidence] : (aiCompetency?.evidenceQuotes || []),
        details: competencyDef,
        hasScore: !!aiCompetency
      } as CompetencyDetail;
    });
  }, [insight.competencies]);

  const [isThemesExpanded, setIsThemesExpanded] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState<Set<string>>(new Set());

  const toggleEvidence = (competencyName: string) => {
    const newExpandedEvidence = new Set(expandedEvidence);
    if (newExpandedEvidence.has(competencyName)) {
      newExpandedEvidence.delete(competencyName);
    } else {
      newExpandedEvidence.add(competencyName);
    }
    setExpandedEvidence(newExpandedEvidence);
  };

  return (
    <>
      {/* Key Themes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Key Themes</h4>
          {themes.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setIsThemesExpanded(!isThemesExpanded)}
            >
              {isThemesExpanded ? 'Show Less' : `Show All (${themes.length})`}
            </Button>
          )}
        </div>
        <div className="grid gap-2">
          {(isThemesExpanded ? themes : themes.slice(0, 3)).map((theme: string, i: number) => (
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

      {/* Competencies - Show ALL core competencies */}
      <div className="space-y-4 mt-8">
        <h4 className="text-sm font-medium">Competency Assessment</h4>
        {competencyDetails.map((competency: CompetencyDetail, i: number) => (
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
                          <p className="font-medium mb-1">Assessment Status:</p>
                          <div className="flex items-center gap-2 mb-1">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              !competency.hasScore ? "bg-gray-400" :
                              competency.confidence === 'low' ? "bg-destructive/50" :
                              competency.confidence === 'medium' ? "bg-yellow-500" :
                              "bg-primary"
                            )} />
                            <p className="text-sm">
                              {!competency.hasScore ? "Not assessed in current feedback" : 
                               `${competency.confidence} confidence`}
                            </p>
                          </div>
                        </div>
                        {competency.details && (
                          <>
                            <div>
                              <p className="font-medium mb-1">Key Aspects:</p>
                              <div className="grid gap-1">
                                {competency.details.aspects.map((aspect: string, i: number) => (
                                  <div key={i} className="flex items-baseline gap-2 text-sm">
                                    <div className="w-1 h-1 rounded-full bg-primary/50 mt-1.5" />
                                    <span>{aspect}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {competency.hasScore && competency.score && (
                              <div>
                                <p className="font-medium mb-1">Score Meaning ({formatScore(competency.score, true)}/5.0):</p>
                                <p className="text-sm">
                                  {competency.details.rubric[Math.round(competency.score) as keyof typeof competency.details.rubric]}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-2">
                {competency.hasScore ? (
                  <>
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
                    <span className="font-medium w-8 text-right">{formatScore(competency.score, true)}</span>
                  </>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Not assessed
                  </Badge>
                )}
              </div>
            </div>
            <div className="relative">
              <Progress 
                value={competency.hasScore && competency.score ? (competency.score / 5) * 100 : 0} 
                className={cn(
                  "h-2",
                  !competency.hasScore ? "bg-gray-100 [&>div]:bg-gray-300" :
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
            {competency.hasScore ? (
              <>
                <p className="text-sm text-muted-foreground">{competency.description}</p>
                {competency.roleSpecificNotes && (
                  <p className="text-sm text-muted-foreground italic mt-1">{competency.roleSpecificNotes}</p>
                )}
                {competency.evidenceQuotes && competency.evidenceQuotes.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-medium text-muted-foreground">Supporting Evidence:</h5>
                      {competency.evidenceQuotes.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => toggleEvidence(competency.name)}
                        >
                          {expandedEvidence.has(competency.name) ? 'Show Less' : `Show All (${competency.evidenceQuotes.length})`}
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {(expandedEvidence.has(competency.name) 
                        ? competency.evidenceQuotes 
                        : competency.evidenceQuotes.slice(0, 2)
                      ).map((quote, i) => (
                        <div key={i} className="text-sm text-muted-foreground pl-3 border-l-2 border-muted">
                          "{quote}"
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No feedback received for this competency in the current review cycle.
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  );
} 