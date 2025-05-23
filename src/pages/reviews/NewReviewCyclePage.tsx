import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreateReviewCycleInput } from '@/types/review';
import { useAuth } from '@/hooks/useAuth';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ReviewCycleType } from '@/types/survey';
import { Badge } from '@/components/ui/badge';

// Preview content for each survey type
const surveyTypeInfo = {
  '360_review': {
    title: '360° Feedback Review',
    description: 'Collect comprehensive feedback about team members from multiple perspectives.',
    questions: [
      'What are this person\'s strengths?',
      'What are areas for improvement for this person?'
    ],
    badge: '360° Review'
  },
  'manager_effectiveness': {
    title: 'Manager Effectiveness Survey',
    description: 'Gather feedback specifically about management skills and leadership qualities.',
    questions: [
      'I understand what is expected of me at work.',
      'My manager contributes to my productivity.',
      'My manager frequently provides feedback that helps me improve my performance.',
      '... and more'
    ],
    badge: 'Management'
  }
};

export function NewReviewCyclePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Omit<CreateReviewCycleInput, 'user_id'>>({
    title: '360° Review - ' + new Date().toLocaleDateString(),
    review_by_date: (() => {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date.toISOString().split('T')[0];
    })(),
    status: 'active',
    type: '360_review' // Default to 360 review for backward compatibility
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      setIsSubmitting(true);

      // Create the review cycle with type
      const { error: cycleError } = await supabase
        .from('review_cycles')
        .insert({
          title: formData.title,
          review_by_date: formData.review_by_date,
          user_id: user.id,
          status: 'active',
          type: formData.type || '360_review' // Ensure we have a default
        })
        .select()
        .single();

      if (cycleError) throw cycleError;

      toast({
        title: "Success",
        description: "Review cycle created successfully",
      });

      navigate('/reviews');
    } catch (error) {
      console.error('Error creating review cycle:', error);
      toast({
        title: "Error",
        description: "Failed to create review cycle",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for survey type change
  const handleTypeChange = (value: ReviewCycleType) => {
    const defaultTitle = value === '360_review' 
      ? `360° Review - ${new Date().toLocaleDateString()}`
      : `Manager Survey - ${new Date().toLocaleDateString()}`;
      
    setFormData(prev => ({
      ...prev,
      type: value,
      title: defaultTitle // Always set default title based on type
    }));
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-4xl">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/reviews')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Review Cycles
          </Button>
          <h1 className="text-2xl font-bold">Create New Review Cycle</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Review Cycle Details</CardTitle>
            <CardDescription>
              Configure the details for your new feedback collection cycle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium" htmlFor="survey-type">
                    Survey Type
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5">
                          <HelpCircle className="h-4 w-4" />
                          <span className="sr-only">Survey type info</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Choose the type of survey that best fits your needs.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                <RadioGroup
                  defaultValue={formData.type}
                  value={formData.type}
                  onValueChange={(value) => handleTypeChange(value as ReviewCycleType)}
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                >
                  {(Object.keys(surveyTypeInfo) as ReviewCycleType[]).map((type) => (
                    <div key={type} className="relative">
                      <RadioGroupItem
                        value={type}
                        id={`survey-type-${type}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`survey-type-${type}`}
                        className="flex cursor-pointer flex-col rounded-md border-2 bg-background p-4 hover:bg-accent/10 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-accent/20"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-base font-medium">{surveyTypeInfo[type].title}</span>
                          <Badge variant="outline">{surveyTypeInfo[type].badge}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {surveyTypeInfo[type].description}
                        </p>
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Sample Questions:</div>
                          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                            {surveyTypeInfo[type].questions.map((question, i) => (
                              <li key={i}>{question}</li>
                            ))}
                          </ul>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="title">
                  Title
                </label>
                <Input
                  id="title"
                  placeholder={formData.type === '360_review' ? "Q4 2023 Performance Review" : "2023 Manager Effectiveness Survey"}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="review_by_date">
                  Review By Date
                </label>
                <Input
                  id="review_by_date"
                  type="date"
                  value={formData.review_by_date}
                  onChange={(e) => setFormData({ ...formData, review_by_date: e.target.value })}
                  required
                />
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/reviews')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Review Cycle'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 