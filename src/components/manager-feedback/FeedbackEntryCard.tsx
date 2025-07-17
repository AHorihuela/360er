import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Calendar, 
  User, 
  Mic,
  Monitor,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { FeedbackResponse, Employee } from '@/types/review';
import { useManagerFeedback } from '@/hooks/useManagerFeedback';
import { useAuth } from '@/hooks/useAuth';

interface FeedbackEntryCardProps {
  feedback: FeedbackResponse;
  employee: Employee;
  reviewCycleId: string;
  onUpdate?: (feedbackId: string) => void;
  onDelete?: (feedbackId: string) => void;
}

export function FeedbackEntryCard({
  feedback,
  employee,
  reviewCycleId,
  onUpdate,
  onDelete
}: FeedbackEntryCardProps) {
  const { user } = useAuth();
  const { updateFeedback, deleteFeedback } = useManagerFeedback({ 
    userId: user?.id, 
    reviewCycleId 
  });
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(
    feedback.strengths || feedback.areas_for_improvement || ''
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'voice':
        return <Mic className="h-4 w-4" />;
      case 'slack':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'voice':
        return 'Voice Input';
      case 'slack':
        return 'Slack';
      default:
        return 'Web Input';
    }
  };

  const handleSave = async () => {
    if (!editedContent.trim()) {
      toast({
        title: "Content Required",
        description: "Feedback content cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const success = await updateFeedback(feedback.id, {
        strengths: '', // Always empty for manager feedback - no auto-categorization
        areas_for_improvement: editedContent // Store all manager feedback here
      });

      if (success) {
        setIsEditing(false);
        onUpdate?.(feedback.id);
      }
    } catch (error) {
      console.error('Error updating feedback:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this feedback entry? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const success = await deleteFeedback(feedback.id);
      if (success) {
        onDelete?.(feedback.id);
      }
    } catch (error) {
      console.error('Error deleting feedback:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setEditedContent(feedback.strengths || feedback.areas_for_improvement || '');
    setIsEditing(false);
  };

  const feedbackContent = feedback.strengths || feedback.areas_for_improvement || '';
  const submittedDate = new Date(feedback.submitted_at);

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{employee.name}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {employee.role}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{format(submittedDate, 'MMM d, yyyy \'at\' h:mm a')}</span>
          </div>
          
          <div className="flex items-center gap-1">
            {getSourceIcon(feedback.source || 'web')}
            <span>{getSourceLabel(feedback.source || 'web')}</span>
          </div>

          {feedback.category && (
            <Badge variant="secondary" className="text-xs">
              {feedback.category}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              placeholder="Update your feedback..."
              className="min-h-24 resize-none"
              maxLength={2000}
            />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {editedContent.length < 10 
                  ? `${10 - editedContent.length} more characters needed`
                  : "Ready to save"
                }
              </span>
              <span>{editedContent.length}/2000</span>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={isUpdating || editedContent.trim().length < 10}
                size="sm"
              >
                {isUpdating ? (
                  <>
                    <Save className="mr-1 h-3 w-3" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-1 h-3 w-3" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isUpdating}
                size="sm"
              >
                <X className="mr-1 h-3 w-3" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {feedbackContent}
            </p>
            
            {feedbackContent.length > 500 && (
              <div className="text-xs text-muted-foreground">
                {feedbackContent.length} characters
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 