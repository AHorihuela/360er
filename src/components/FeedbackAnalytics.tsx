import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { FeedbackResponse } from "@/types/feedback";

interface Insight {
  keyThemes: string[];
  uniqueInsights: string[];
  competencyScores: Record<string, number>;
}

interface Props {
  feedbackResponses: FeedbackResponse[];
  employeeName: string;
  employeeRole: string;
  feedbackRequestId: string;
  lastAnalyzed?: string;
  insights: Insight;
  onRerunAnalysis?: () => void;
}

export function FeedbackAnalytics({ 
  insights, 
  lastAnalyzed, 
  feedbackResponses, 
  employeeName, 
  employeeRole, 
  feedbackRequestId,
  onRerunAnalysis 
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Feedback Analytics</h2>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs font-normal bg-black/5 hover:bg-black/10">
                  Beta
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[300px]">
                <p className="text-sm">
                  This feature uses AI to analyze feedback patterns and provide quantitative insights. 
                  Currently in beta, we're continuously improving the analysis algorithms.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRerunAnalysis}
          className="h-8 text-xs flex items-center gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Rerun Analysis
        </Button>
      </div>
      {lastAnalyzed && (
        <p className="text-sm text-muted-foreground -mt-2">
          Last analyzed {lastAnalyzed}
        </p>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Overall Analysis</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {feedbackResponses.length} Responses
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            {/* Key Themes Column */}
            <div className="space-y-3">
              <h4 className="font-medium">Key Themes</h4>
              <ul className="space-y-2 text-sm">
                {insights.keyThemes.map((theme: string, index: number) => (
                  <li key={index} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{theme}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Unique Insights Column */}
            <div className="space-y-3">
              <h4 className="font-medium">Unique Insights</h4>
              <ul className="space-y-2 text-sm">
                {insights.uniqueInsights.map((insight: string, index: number) => (
                  <li key={index} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Competency scores below in full width */}
          <div className="mt-8">
            <h4 className="font-medium mb-4">Competency Assessment</h4>
            {/* ... rest of the competency scores code ... */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 