import { Users } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScoreWithOutlier } from '../types';

interface RelationshipCoverageCardProps {
  score: ScoreWithOutlier;
}

export function RelationshipCoverageCard({ score }: RelationshipCoverageCardProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="p-6 bg-background rounded-lg border relative group hover:border-blue-200 transition-colors cursor-help">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-100 transform origin-left transition-transform duration-500 group-hover:scale-x-100" 
                 style={{ width: `${((score.confidenceMetrics?.factors.relationshipCount || 0) / 3) * 100}%` }} />
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-full bg-blue-50">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <span className="text-sm font-medium">Relationship Coverage</span>
            </div>
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">{(score.confidenceMetrics?.factors.relationshipCount || 0)}</span>
                  <span className="text-sm text-muted-foreground">of 3 types</span>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                    {Math.round(((score.confidenceMetrics?.factors.relationshipCount || 0) / 3) * 100)}% coverage
                  </span>
                </div>
              </div>

              {/* Relationship Type Breakdown */}
              <div className="space-y-2">
                {/* Senior */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Senior</span>
                    <span className="text-slate-500">{score.relationshipBreakdown?.senior || 0} pieces</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500/80 transition-all duration-300"
                      style={{ 
                        width: `${Math.min(((score.relationshipBreakdown?.senior || 0) / (score.evidenceCount || 1)) * 100, 100)}%`
                      }}
                    />
                  </div>
                </div>

                {/* Peer */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Peer</span>
                    <span className="text-slate-500">{score.relationshipBreakdown?.peer || 0} pieces</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500/80 transition-all duration-300"
                      style={{ 
                        width: `${Math.min(((score.relationshipBreakdown?.peer || 0) / (score.evidenceCount || 1)) * 100, 100)}%`
                      }}
                    />
                  </div>
                </div>

                {/* Junior */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Junior</span>
                    <span className="text-slate-500">{score.relationshipBreakdown?.junior || 0} pieces</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500/80 transition-all duration-300"
                      style={{ 
                        width: `${Math.min(((score.relationshipBreakdown?.junior || 0) / (score.evidenceCount || 1)) * 100, 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Legend/Note */}
              <div className="text-xs text-muted-foreground pt-1 border-t">
                Bars show distribution of evidence across relationships
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <div className="space-y-2">
            <p className="text-sm">Feedback diversity across relationship types:</p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• Senior (40% weight): Leadership perspective</li>
              <li>• Peer (35% weight): Team collaboration view</li>
              <li>• Junior (25% weight): Growth & mentorship impact</li>
            </ul>
            <p className="text-xs text-muted-foreground pt-1 border-t mt-2">
              Higher coverage across relationships indicates more balanced feedback
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 