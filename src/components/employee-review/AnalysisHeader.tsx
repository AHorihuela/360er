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
          <h2 className="text-xl font-semibold">Feedback Analytics</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-xs font-normal bg-black text-white hover:bg-black/90 cursor-help transition-colors border-black">
                  Beta
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="right" align="start" className="max-w-[300px] p-4">
                <div className="space-y-2">
                  <p className="font-medium">AI-Powered Analysis</p>
                  <p className="text-sm text-muted-foreground">
                    This feature uses AI to analyze feedback responses and identify patterns. Results may vary based on:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                    <li>Number of responses</li>
                    <li>Detail level in feedback</li>
                    <li>Consistency across reviewers</li>
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