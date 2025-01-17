import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw } from 'lucide-react';

interface Props {
  responseCount: number;
  isInitialState?: boolean;
}

export function EmptyAnalysisState({ responseCount, isInitialState = true }: Props) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="rounded-full bg-primary/10 p-3">
            <RefreshCw className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="font-medium">
              {isInitialState ? 'Ready to Analyze' : 'Generate Analysis'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isInitialState 
                ? `Click the Generate Analysis button above to analyze ${responseCount} feedback responses`
                : 'Click the Generate Analysis button above to analyze your feedback responses'
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 