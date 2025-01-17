import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, BarChart2, ChevronDown } from 'lucide-react';
import { cn } from "@/lib/utils";
import { ScoreWithOutlier } from '../types';

interface PerformanceOverviewProps {
  score: ScoreWithOutlier;
}

export function PerformanceOverview({ score }: PerformanceOverviewProps) {
  // Helper function to get performance status
  const getPerformanceStatus = (score: number) => {
    if (score >= 4.0) return { 
      label: 'Significantly Exceeding', 
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Strong performance with consistent excellence',
      icon: <TrendingUp className="h-5 w-5 text-green-500" />
    };
    if (score >= 3.5) return { 
      label: 'Exceeding Expectations', 
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      description: 'Performance above expected level',
      icon: <TrendingUp className="h-5 w-5 text-green-500" />
    };
    if (score >= 3.0) return { 
      label: 'Meeting Expectations', 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      description: 'Meeting basic role requirements',
      icon: <BarChart2 className="h-5 w-5 text-yellow-500" />
    };
    return { 
      label: 'Needs Improvement', 
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      description: 'Performance below expected level',
      icon: <ChevronDown className="h-5 w-5 text-red-500" />
    };
  };

  // Helper function to get confidence display info
  const getConfidenceInfo = (confidence: 'low' | 'medium' | 'high') => {
    switch (confidence) {
      case 'high':
        return {
          icon: <Users className="h-5 w-5 text-green-500" />,
          color: 'text-green-500',
          badge: 'bg-green-100 text-green-700',
          description: 'Based on consistent feedback across multiple relationships with strong supporting evidence'
        };
      case 'medium':
        return {
          icon: <Users className="h-5 w-5 text-yellow-500" />,
          color: 'text-yellow-500',
          badge: 'bg-yellow-100 text-yellow-700',
          description: 'Based on moderate evidence with some variation in feedback patterns'
        };
      case 'low':
        return {
          icon: <Users className="h-5 w-5 text-red-500" />,
          color: 'text-red-500',
          badge: 'bg-red-100 text-red-700',
          description: 'Limited by either the amount of evidence available or significant variations in feedback'
        };
    }
  };

  const performance = getPerformanceStatus(score.score);
  const confidenceInfo = getConfidenceInfo(score.confidence);

  return (
    <div className={cn(
      "p-6 rounded-lg border transition-colors",
      performance.bgColor
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {performance.icon}
            <h3 className={cn("text-lg font-semibold", performance.color)}>
              {performance.label}
            </h3>
          </div>
          <div className="text-2xl font-medium">
            {score.score.toFixed(1)}
            <span className="text-base text-muted-foreground">/5.0</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {performance.description}
          </p>
        </div>
        <Badge 
          variant="secondary" 
          className={cn(
            confidenceInfo.badge,
            "ml-2 flex items-center gap-1.5"
          )}
        >
          {confidenceInfo.icon}
          {score.confidence.charAt(0).toUpperCase() + score.confidence.slice(1)} Confidence
        </Badge>
      </div>

      <div className="mt-4 space-y-1">
        <div className="flex justify-between text-sm">
          <span>Distance from Target (3.5)</span>
          <span>{Math.abs(score.score - 3.5).toFixed(1)} points {score.score >= 3.5 ? 'above' : 'below'}</span>
        </div>
        <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-0.5 h-full bg-slate-300" />
          </div>
          {score.score >= 3.5 ? (
            <div 
              className="absolute top-0 bottom-0 left-1/2 bg-green-500"
              style={{ width: `${((score.score - 3.5) / 1.5) * 50}%` }}
            />
          ) : (
            <div 
              className="absolute top-0 bottom-0 bg-red-500"
              style={{ 
                right: '50%',
                width: `${((3.5 - score.score) / 1.5) * 50}%`
              }}
            />
          )}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>-1.5</span>
          <span className="text-slate-500">Target (3.5)</span>
          <span>+1.5</span>
        </div>
      </div>
    </div>
  );
} 