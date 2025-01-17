import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ScoreWithOutlier } from './types';

interface CompetencySummaryCardProps {
  score: ScoreWithOutlier;
  isExpanded: boolean;
  onToggle: () => void;
}

function getScoreColor(score: number) {
  if (score >= 4.0) return '[&>div]:bg-emerald-500';
  if (score >= 3.5) return '[&>div]:bg-blue-500';
  if (score >= 3.0) return '[&>div]:bg-yellow-500';
  if (score >= 2.5) return '[&>div]:bg-orange-500';
  return '[&>div]:bg-red-500';
}

function getScoreBgColor(score: number) {
  if (score >= 4.0) return 'bg-emerald-100';
  if (score >= 3.5) return 'bg-blue-100';
  if (score >= 3.0) return 'bg-yellow-100';
  if (score >= 2.5) return 'bg-orange-100';
  return 'bg-red-100';
}

function getConfidenceOpacity(confidence: 'low' | 'medium' | 'high') {
  switch (confidence) {
    case 'high': return '[&>div]:opacity-100';
    case 'medium': return '[&>div]:opacity-70';
    case 'low': return '[&>div]:opacity-40';
  }
}

// Define the areas of evaluation for each competency
const COMPETENCY_AREAS = {
  'Technical/Functional Expertise': [
    'Role-specific skills and knowledge',
    'Industry and domain expertise',
    'Technical proficiency and best practices',
    'Knowledge sharing and documentation',
    'Problem-solving capabilities'
  ],
  'Leadership & Influence': [
    'Taking initiative and ownership',
    'Guiding and inspiring others',
    'Influencing outcomes positively',
    'Mentoring and role modeling',
    'Creating and communicating vision'
  ],
  'Collaboration & Communication': [
    'Information sharing effectiveness',
    'Cross-team collaboration',
    'Clarity of communication',
    'Stakeholder management',
    'Conflict resolution skills'
  ],
  'Innovation & Problem-Solving': [
    'Creative solution generation',
    'Adaptability to change',
    'Initiative in improvements',
    'Collaborative ideation',
    'Impact of implemented solutions'
  ],
  'Execution & Accountability': [
    'Meeting deadlines and commitments',
    'Quality of deliverables',
    'Ownership of outcomes',
    'Problem resolution',
    'Project completion track record'
  ],
  'Emotional Intelligence & Culture Fit': [
    'Self-awareness',
    'Empathy and respect',
    'Cultural alignment',
    'Interpersonal effectiveness',
    'Conflict management'
  ],
  'Growth & Development': [
    'Continuous learning mindset',
    'Skill development progress',
    'Feedback receptiveness',
    'Knowledge sharing',
    'Goal setting and achievement'
  ]
} as const;

export function CompetencySummaryCard({ score, isExpanded, onToggle }: CompetencySummaryCardProps) {
  const getConfidenceTooltip = (confidence: 'low' | 'medium' | 'high', evidenceCount: number, effectiveEvidenceCount: number, hasOutliers: boolean) => {
    const mainContent = (
      <div className="space-y-4 text-left">
        {/* Evidence Summary Section */}
        <div className="pb-3 border-b border-border">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Evidence Summary</div>
          <div className="mt-1.5">
            <div>
              <span className="text-2xl font-semibold">
                {effectiveEvidenceCount.toFixed(1)}
              </span>
              <span className="text-sm font-normal text-muted-foreground ml-1">effective evidence</span>
            </div>
            <div className="text-xs text-muted-foreground">
              from {evidenceCount} total mentions
            </div>
          </div>
        </div>

        {/* Confidence Factors Section */}
        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Confidence Factors
          </div>
          <div className="space-y-1.5">
            <div className="text-sm space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-emerald-500 shrink-0">•</span>
                <span>Evidence Quantity (35%): {effectiveEvidenceCount >= 12 ? "High" : effectiveEvidenceCount >= 8 ? "Medium" : "Low"}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-emerald-500 shrink-0">•</span>
                <span>Relationship Coverage (25%): Need feedback from senior, peer, and junior relationships</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-emerald-500 shrink-0">•</span>
                <span>Score Consistency (25%): Based on variance between scores</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-emerald-500 shrink-0">•</span>
                <span>Distribution Quality (15%): How evenly feedback is spread across relationships</span>
              </div>
            </div>
          </div>
        </div>

        {/* Requirements Section */}
        <div className="pt-3 border-t border-border space-y-2">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Confidence Requirements
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-baseline gap-2">
              <span className="text-green-500 shrink-0">•</span>
              <span><span className="font-medium">High</span>: 12+ evidence pieces AND at least 2 relationship types</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-yellow-500 shrink-0">•</span>
              <span><span className="font-medium">Medium</span>: 8+ evidence pieces AND at least 2 relationship types</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-red-500 shrink-0">•</span>
              <span><span className="font-medium">Low</span>: Single relationship type OR less than 8 evidence pieces</span>
            </div>
          </div>
        </div>

        {/* Notices Section */}
        {(hasOutliers || confidence === 'low') && (
          <div className="pt-3 border-t border-border space-y-2">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Notices
            </div>
            <div className="space-y-1.5">
              {confidence === 'low' && (
                <div className="flex items-baseline gap-2">
                  <span className="text-red-500 shrink-0">•</span>
                  <span className="text-sm">More diverse feedback sources needed</span>
                </div>
              )}
              {hasOutliers && (
                <div className="flex items-baseline gap-2">
                  <span className="text-yellow-500 shrink-0">•</span>
                  <span className="text-sm">Some scores were adjusted to account for statistical outliers</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );

    return mainContent;
  };

  const scoreColor = getScoreColor(score.score);
  const scoreBgColor = getScoreBgColor(score.score);
  const confidenceOpacity = getConfidenceOpacity(score.confidence);
  const areas = COMPETENCY_AREAS[score.name as keyof typeof COMPETENCY_AREAS] || [];

  return (
    <div>
      <div 
        className={cn(
          "flex items-center justify-between mb-2",
          "cursor-pointer hover:bg-slate-50/80 -mx-4 px-4 py-2 rounded-sm",
          "transition-colors"
        )}
        onClick={onToggle}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{score.name}</h4>
            <Badge 
              variant={score.confidence === 'low' ? 'destructive' : 
                     score.confidence === 'medium' ? 'outline' : 
                     'secondary'}
              className={cn(
                "text-xs capitalize",
                score.confidence === 'medium' && "bg-yellow-50 text-yellow-700",
                score.confidence === 'high' && "bg-green-50 text-green-700"
              )}
            >
              {score.confidence}
            </Badge>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isExpanded && "transform rotate-180"
            )} />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground mt-0.5">
            {areas.join(' • ')}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5">
            <div className="text-2xl font-semibold">{score.score.toFixed(1)}/5.0</div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className={cn(
                    "h-4 w-4 hover:text-foreground transition-colors",
                    score.hasOutliers ? "text-yellow-500 hover:text-yellow-600" : "text-muted-foreground"
                  )} />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[300px]">
                  {getConfidenceTooltip(
                    score.confidence, 
                    score.evidenceCount, 
                    score.effectiveEvidenceCount, 
                    score.hasOutliers ?? false
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <div className="relative mt-2">
        <Progress 
          value={(score.score / 5) * 100} 
          className={cn(
            "h-2",
            scoreBgColor,
            scoreColor,
            confidenceOpacity
          )}
        />
        <div className="absolute inset-0 grid grid-cols-5 -mx-[1px]">
          {[1,2,3,4,5].map(n => (
            <div key={n} className="border-l border-muted last:border-r" />
          ))}
        </div>
        <div className="absolute -bottom-4 left-[70%] w-0.5 h-2 bg-yellow-500">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-[10px] text-muted-foreground">
                  3.5
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-sm">Expected performance level</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
} 