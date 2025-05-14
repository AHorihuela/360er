import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardFeedbackResponse } from '@/types/feedback/dashboard';
import { useNavigate } from 'react-router-dom';

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

// Helper function to get color based on score
function getScoreColor(score: number): { bg: string, border: string, text: string, fill: string } {
  if (score >= 4) return { 
    bg: "bg-green-50", 
    border: "border-green-500", 
    text: "text-green-700",
    fill: "bg-green-500"
  };
  if (score >= 3) return { 
    bg: "bg-yellow-50", 
    border: "border-yellow-500", 
    text: "text-yellow-700",
    fill: "bg-yellow-500"
  };
  return { 
    bg: "bg-red-50", 
    border: "border-red-500", 
    text: "text-red-700",
    fill: "bg-red-500"
  };
}

// Helper function to get progress bar color
function getProgressColor(score: number): string {
  if (score >= 4) return "bg-green-500";
  if (score >= 3) return "bg-yellow-500";
  return "bg-red-500";
}

interface ManagerSurveyReviewCardProps {
  review: DashboardFeedbackResponse;
  questionIdToTextMap: Record<string, string>;
  reviewCycleId?: string;
}

export function ManagerSurveyReviewCard({ 
  review, 
  questionIdToTextMap,
  reviewCycleId
}: ManagerSurveyReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  
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
  
  // Get colors based on average score
  const scoreColors = getScoreColor(averageScore);
  
  // Event handler for card click
  const handleCardClick = () => {
    if (reviewCycleId && review.employee?.id) {
      navigate(`/reviews/${reviewCycleId}/employee/${review.employee.id}`);
    }
  };
  
  // Event handler for details button click to prevent navigation
  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the card click event
    setExpanded(!expanded);
  };
  
  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all",
        reviewCycleId && review.employee?.id ? "hover:shadow-md cursor-pointer" : ""
      )}
      onClick={reviewCycleId && review.employee?.id ? handleCardClick : undefined}
    >
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
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Average score visualization */}
        <div className="flex items-center gap-4 mb-4">
          <div className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border-2",
            scoreColors.border,
            scoreColors.bg,
            scoreColors.text
          )}>
            {averageScore.toFixed(1)}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium mb-1">Overall Rating</div>
            <div className="h-2.5 mb-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full", scoreColors.fill)}
                style={{ width: `${(averageScore / 5) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>5</span>
            </div>
          </div>
        </div>
        
        {/* Toggle to show/hide details */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleDetailsClick}
          className="w-full text-xs justify-between"
        >
          {expanded ? "Hide details" : "Show all responses"}
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </Button>
      </CardContent>
      
      {/* Expandable detailed responses */}
      {expanded && (
        <div className="px-6 pb-4 border-t" onClick={(e) => e.stopPropagation()}>
          <div className="pt-3 space-y-3">
            {likertResponses.map(([questionId, value]) => {
              const questionScore = Number(value);
              const questionColors = getScoreColor(questionScore);
              
              return (
                <div key={questionId} className="space-y-1">
                  <div className="text-sm">{getQuestionText(questionId)}</div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full", questionColors.fill)}
                        style={{ width: `${(questionScore / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className={cn(
                      "text-sm font-medium",
                      questionColors.text
                    )}>
                      {questionScore}/5
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {getLikertLabel(questionScore)}
                    </span>
                  </div>
                </div>
              );
            })}
            
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