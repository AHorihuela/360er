import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatLastAnalyzed } from "@/utils/feedback";

interface Props {
  lastAnalyzedAt: string | null;
  shouldShowAnalysis: boolean;
  needsInitialAnalysis: boolean;
  shouldShowUpdateButton: boolean;
  isAnalyzing: boolean;
  onAnalyze: () => void;
}

export function AnalysisHeader({
  lastAnalyzedAt,
  shouldShowAnalysis,
  needsInitialAnalysis,
  shouldShowUpdateButton,
  isAnalyzing,
  onAnalyze
}: Props) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Feedback Analytics</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="secondary" className="text-xs font-medium bg-black text-white hover:bg-black/90">Beta</Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-[350px] p-4 space-y-3">
                <h3 className="font-semibold text-sm">How Scores Are Calculated</h3>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Each competency score (0-5) is calculated by:</p>
                  <ul className="text-xs space-y-1.5 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      Combining feedback from seniors (40%), peers (35%), and juniors (25%)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      Adjusting for outliers and evidence quality
                    </li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Confidence levels (Low/Medium/High) are based on:</p>
                  <ul className="text-xs space-y-1.5 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      Number of reviews (40%)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      How much reviewers agree (30%)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      Mix of feedback sources (20%)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      Balance of perspectives (10%)
                    </li>
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {lastAnalyzedAt && shouldShowAnalysis && (
          <p className="text-sm text-muted-foreground">
            Last analyzed {formatLastAnalyzed(lastAnalyzedAt)}
          </p>
        )}
      </div>
      {needsInitialAnalysis ? (
        <Button
          variant="default"
          size="sm"
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="h-8 text-xs"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="ml-1.5">Analyzing...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="ml-1.5">Generate Analysis</span>
            </>
          )}
        </Button>
      ) : shouldShowUpdateButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="h-8 text-xs"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="ml-1.5">Analyzing...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="ml-1.5">Update Analysis</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
} 