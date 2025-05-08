import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardFeedbackResponse } from '@/types/feedback/dashboard';

// Helper function to get initials from name
function getInitials(name: string | undefined): string {
  if (!name) return '?';
  
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

// Helper function to format date
function formatDate(date: string | null | undefined): string {
  if (!date) return 'Unknown';
  return new Date(date).toLocaleDateString();
}

interface ManagerSurveyReviewCardProps {
  review: DashboardFeedbackResponse;
  questionIdToTextMap: Record<string, string>;
}

export function ManagerSurveyReviewCard({ 
  review, 
  questionIdToTextMap 
}: ManagerSurveyReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Extract Likert responses and calculate average
  const likertResponses = Object.entries(review.responses || {})
    .filter(([, value]) => typeof value === 'number');
  
  const averageScore = likertResponses.length > 0
    ? likertResponses.reduce((sum, [, value]) => sum + Number(value), 0) / likertResponses.length
    : 0;
  
  // Get highest and lowest scores for highlights
  const sortedScores = [...likertResponses].sort(([, a], [, b]) => Number(b) - Number(a));
  const highestScore = sortedScores.length > 0 ? sortedScores[0] : null;
  const lowestScore = sortedScores.length > 0 ? sortedScores[sortedScores.length - 1] : null;
  
  // Helper function to get question text by ID
  const getQuestionText = (questionId: string): string => {
    return questionIdToTextMap[questionId] || `Question ${questionId.slice(0, 6)}...`;
  };
  
  // Helper to get Likert scale label
  const getLikertLabel = (value: number): string => {
    switch (value) {
      case 1: return "Strongly Disagree";
      case 2: return "Disagree";
      case 3: return "Neither agree nor disagree";
      case 4: return "Agree";
      case 5: return "Strongly Agree";
      default: return "Unknown";
    }
  };
  
  // Get the employee initials for the avatar
  const employeeInitials = review.employee?.name ? getInitials(review.employee.name) : '?';
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition-all">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 bg-primary/10">
              <AvatarFallback>{employeeInitials}</AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-medium">{review.employee?.name || 'Unknown Employee'}</h4>
              <div className="text-sm text-muted-foreground">
                <span>{review.employee?.role || 'No role specified'}</span>
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div>{formatDate(review.submitted_at)}</div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Manager Survey
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Average score visualization */}
        <div className="flex items-center gap-4 mb-3">
          <div className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border-2",
            averageScore >= 4.5 ? "border-emerald-500 bg-emerald-50 text-emerald-700" :
            averageScore >= 4 ? "border-green-500 bg-green-50 text-green-700" :
            averageScore >= 3 ? "border-blue-500 bg-blue-50 text-blue-700" :
            averageScore >= 2 ? "border-orange-500 bg-orange-50 text-orange-700" :
            "border-red-500 bg-red-50 text-red-700"
          )}>
            {averageScore.toFixed(1)}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium mb-1">Overall Rating</div>
            <Progress 
              value={(averageScore / 5) * 100} 
              className={cn(
                "h-2.5 mb-1",
                averageScore >= 4.5 ? "bg-emerald-500" :
                averageScore >= 4 ? "bg-green-500" :
                averageScore >= 3 ? "bg-blue-500" :
                averageScore >= 2 ? "bg-orange-500" :
                "bg-red-500"
              )} 
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>5</span>
            </div>
          </div>
        </div>
        
        {/* Highest/lowest score highlights */}
        {highestScore && lowestScore && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-2 rounded-md bg-green-50 border border-green-100">
              <div className="text-xs text-green-700 font-medium mb-1">Highest Score</div>
              <div className="flex items-center justify-between">
                <div className="text-sm line-clamp-1">{getQuestionText(highestScore[0])}</div>
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                  {Number(highestScore[1])}/5
                </Badge>
              </div>
            </div>
            <div className="p-2 rounded-md bg-orange-50 border border-orange-100">
              <div className="text-xs text-orange-700 font-medium mb-1">Lowest Score</div>
              <div className="flex items-center justify-between">
                <div className="text-sm line-clamp-1">{getQuestionText(lowestScore[0])}</div>
                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                  {Number(lowestScore[1])}/5
                </Badge>
              </div>
            </div>
          </div>
        )}
        
        {/* Toggle to show/hide details */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setExpanded(!expanded)}
          className="w-full text-xs justify-between"
        >
          {expanded ? "Hide details" : "Show all responses"}
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </Button>
      </CardContent>
      
      {/* Expandable detailed responses */}
      {expanded && (
        <div className="px-6 pb-4 border-t">
          <div className="pt-3 space-y-3">
            {likertResponses.map(([questionId, value]) => (
              <div key={questionId} className="space-y-1">
                <div className="text-sm">{getQuestionText(questionId)}</div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={(Number(value) / 5) * 100} 
                    className={cn(
                      "h-1.5 w-24",
                      Number(value) >= 4.5 ? "bg-emerald-500" :
                      Number(value) >= 4 ? "bg-green-500" :
                      Number(value) >= 3 ? "bg-blue-500" :
                      Number(value) >= 2 ? "bg-orange-500" :
                      "bg-red-500"
                    )} 
                  />
                  <span className={cn(
                    "text-sm font-medium",
                    Number(value) >= 4.5 ? "text-emerald-700" :
                    Number(value) >= 4 ? "text-green-700" :
                    Number(value) >= 3 ? "text-blue-700" :
                    Number(value) >= 2 ? "text-orange-700" :
                    "text-red-700"
                  )}>
                    {Number(value)}/5
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {getLikertLabel(Number(value))}
                  </span>
                </div>
              </div>
            ))}
            
            {/* Open-ended responses if any */}
            {Object.entries(review.responses || {})
              .filter(([, value]) => typeof value === 'string' && String(value).trim().length > 0)
              .map(([questionId, value]) => (
                <div key={questionId} className="pt-2 mt-2 border-t">
                  <div className="text-sm font-medium mb-1">{getQuestionText(questionId)}</div>
                  <p className="text-sm whitespace-pre-line">{String(value)}</p>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </Card>
  );
} 