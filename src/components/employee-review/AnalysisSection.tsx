import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type RelationshipInsight } from "@/types/feedback/analysis";
import { InsightContent } from './InsightContent';

interface Props {
  relationshipType: string;
  insight: RelationshipInsight | undefined;
  responseCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  variant: 'aggregate' | 'perspective';
}

export const AnalysisSection = memo(function AnalysisSection({
  relationshipType,
  insight,
  responseCount,
  isExpanded,
  onToggle,
  variant
}: Props) {
  const isAggregate = variant === 'aggregate';
  
  return (
    <Card className={isAggregate ? "border-2" : "border border-muted"}>
      <CardHeader 
        className={cn(
          "cursor-pointer hover:bg-muted/50 transition-colors",
          isAggregate ? "bg-muted/30" : "py-3"
        )}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className={isAggregate ? "text-xl" : "text-base"}>
              {isAggregate ? "Overall Analysis" : `${relationshipType.charAt(0).toUpperCase() + relationshipType.slice(1)} Perspective`}
            </CardTitle>
            <Badge variant="outline" className="capitalize">
              {responseCount} {responseCount === 1 ? 'response' : 'responses'}
            </Badge>
          </div>
          <ChevronDown className={cn(
            "transition-transform",
            isAggregate ? "h-5 w-5" : "h-4 w-4",
            isExpanded && "rotate-180"
          )} />
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-6">
          <InsightContent insight={insight} />
        </CardContent>
      )}
    </Card>
  );
}); 