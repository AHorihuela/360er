import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface Props {
  feedbackResponses: any[];
}

export function FeedbackAnalytics({ 
  feedbackResponses
}: Props) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Preserve existing functionality */}
          {feedbackResponses.map((response, index) => (
            <div key={index} className="space-y-2">
              <Progress value={0} className="h-2" />
              <Badge variant="outline">Feedback {index + 1}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 