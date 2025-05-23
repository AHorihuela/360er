import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Info } from 'lucide-react';
import { type CoreFeedbackResponse } from '@/types/feedback/base';
import { MINIMUM_REVIEWS_REQUIRED } from '@/constants/feedback';

interface Props {
  feedbackResponses: CoreFeedbackResponse[];
}

export function MinimumReviewsMessage({ feedbackResponses }: Props) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-6">
          <div className="rounded-full bg-primary/10 p-4 shrink-0">
            <Info className="h-6 w-6 text-primary" />
          </div>
          
          <div className="flex-1">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">AI-Powered Feedback Analysis</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Once {MINIMUM_REVIEWS_REQUIRED} reviews are collected, our AI will analyze the feedback to provide detailed insights.
              </p>
            </div>

            <div className="bg-muted/30 rounded-lg px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium">Collection Progress</p>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-semibold">{feedbackResponses.length}</span>
                    <span className="text-sm text-muted-foreground">of {MINIMUM_REVIEWS_REQUIRED} reviews</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-primary">
                    {Math.min(Math.round((feedbackResponses.length / MINIMUM_REVIEWS_REQUIRED) * 100), 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {MINIMUM_REVIEWS_REQUIRED - feedbackResponses.length} more needed
                  </div>
                </div>
              </div>
              <Progress 
                value={Math.min((feedbackResponses.length / MINIMUM_REVIEWS_REQUIRED) * 100, 100)} 
                className="h-2"
              />
            </div>

            {feedbackResponses.length > 0 && (
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-primary/50" />
                <span>Analysis will automatically unlock at {MINIMUM_REVIEWS_REQUIRED} reviews</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 