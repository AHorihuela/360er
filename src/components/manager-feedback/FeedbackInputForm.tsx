import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Send, Mic, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useManagerFeedback } from '@/hooks/useManagerFeedback';
import { EmployeeSelector } from './EmployeeSelector';
import { Employee } from '@/types/review';

interface FeedbackInputFormProps {
  reviewCycleId?: string; // Required review cycle ID
  employees?: Employee[]; // Employees from the selected cycle
  onSubmissionSuccess?: () => void;
  cycleTitle?: string; // Display cycle context
  hideEmployeeSelector?: boolean; // Hide employee selector when already on specific employee page
}

export function FeedbackInputForm({ 
  reviewCycleId, 
  employees = [], 
  onSubmissionSuccess,
  cycleTitle,
  hideEmployeeSelector = false
}: FeedbackInputFormProps) {
  const { user } = useAuth();
  const { submitManagerFeedback, isSubmitting } = useManagerFeedback({ 
    userId: user?.id, 
    reviewCycleId 
  });
  const { toast } = useToast();
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    hideEmployeeSelector && employees.length === 1 ? employees[0].id : ''
  );
  const [feedbackContent, setFeedbackContent] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);

  const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);

  // Show message if no review cycle is selected
  if (!reviewCycleId) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="py-12 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Manager Feedback Cycle</h3>
          <p className="text-muted-foreground">
            Please select an active Manager-to-Employee feedback cycle to provide feedback for your team members.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployeeId) {
      toast({
        title: "Employee Required",
        description: "Please select an employee to provide feedback for.",
        variant: "destructive",
      });
      return;
    }
    
    if (!feedbackContent.trim()) {
      toast({
        title: "Feedback Required", 
        description: "Please enter your feedback before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (feedbackContent.trim().length < 10) {
      toast({
        title: "Feedback Too Short",
        description: "Please provide more detailed feedback (at least 10 characters).",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await submitManagerFeedback({
        employee_id: selectedEmployeeId,
        content: feedbackContent.trim(),
        source: isVoiceMode ? 'voice' : 'web'
      });

      if (result) {
        // Clear form on success
        setFeedbackContent('');
        setSelectedEmployeeId('');
        setIsVoiceMode(false);
        
        onSubmissionSuccess?.();
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const handleVoiceToggle = () => {
    setIsVoiceMode(!isVoiceMode);
    // Voice recording logic will be added when we create the VoiceToTextInput component
    toast({
      title: "Voice Input",
      description: "Voice input feature coming soon!",
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Quick Feedback Entry
        </CardTitle>
        {cycleTitle && (
          <p className="text-sm text-muted-foreground">
            Adding feedback to: <span className="font-medium">{cycleTitle}</span>
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Employee Selection - Only show if not hidden */}
          {!hideEmployeeSelector && (
            <div className="space-y-2">
              <Label htmlFor="employee-select">Select Team Member</Label>
              <EmployeeSelector
                employees={employees}
                selectedEmployeeId={selectedEmployeeId}
                onEmployeeChange={setSelectedEmployeeId}
                placeholder={employees.length === 0 
                  ? "No team members in this cycle..." 
                  : "Choose who you're providing feedback for..."
                }
                disabled={employees.length === 0}
              />
              {employees.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Add team members to this cycle to start providing feedback.
                </p>
              )}
            </div>
          )}

          {/* Feedback Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="feedback-content">
                Your Feedback
                {selectedEmployee && (
                  <span className="text-sm text-muted-foreground ml-2">
                    for {selectedEmployee.name}
                  </span>
                )}
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleVoiceToggle}
                className="flex items-center gap-1"
                disabled={!selectedEmployeeId}
              >
                <Mic className={`h-4 w-4 ${isVoiceMode ? 'text-red-500' : ''}`} />
                Voice
              </Button>
            </div>
            
            <Textarea
              id="feedback-content"
              value={feedbackContent}
              onChange={(e) => setFeedbackContent(e.target.value)}
              placeholder="Share your observations about this team member's performance, contributions, or areas for growth. Be specific and constructive..."
              className="min-h-32 resize-none"
              maxLength={2000}
              disabled={!selectedEmployeeId}
            />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {feedbackContent.length < 10 
                  ? `${10 - feedbackContent.length} more characters needed`
                  : "Ready to submit"
                }
              </span>
              <span>{feedbackContent.length}/2000</span>
            </div>
          </div>

          {/* AI Enhancement Note */}
          {feedbackContent.length > 20 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 <strong>AI Enhancement:</strong> After submission, our AI will help categorize this feedback 
                and suggest any follow-up questions to make it even more actionable.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full"
            disabled={
              isSubmitting || 
              !selectedEmployeeId || 
              feedbackContent.trim().length < 10 ||
              employees.length === 0
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Feedback...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Feedback
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 