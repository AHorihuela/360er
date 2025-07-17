import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, HelpCircle, Users, TrendingUp, MessageSquare, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreateReviewCycleInput } from '@/types/review';
import { useAuth } from '@/hooks/useAuth';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ReviewCycleType } from '@/types/survey';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Survey type configuration with icons and streamlined content
const surveyTypeInfo = {
  '360_review': {
    title: '360° Feedback Review',
    description: 'Comprehensive feedback from multiple perspectives',
    icon: Users,
    badge: '360° Review',
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    questions: [
      'What are this person\'s strengths?',
      'What are areas for improvement for this person?'
    ]
  },
  'manager_effectiveness': {
    title: 'Manager Effectiveness Survey',
    description: 'Structured feedback about leadership and management skills',
    icon: TrendingUp,
    badge: 'Management',
    color: 'bg-green-50 border-green-200 hover:bg-green-100',
    questions: [
      'I understand what is expected of me at work.',
      'My manager contributes to my productivity.',
      'My manager frequently provides feedback that helps me improve my performance.',
      '... and more structured questions'
    ]
  },
  'manager_to_employee': {
    title: 'Manager-to-Employee Feedback',
    description: 'Ongoing feedback cycle for continuous observations',
    icon: MessageSquare,
    badge: 'Continuous',
    color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
    questions: [
      'Capture real-time observations about performance',
      'Record specific examples and situations as they occur',
      'Generate reports for any time period (weekly, monthly, quarterly)',
      'No fixed deadlines - truly continuous feedback collection'
    ]
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
    let defaultTitle: string;
    let defaultDate: string;
    
    switch (value) {
      case '360_review':
        defaultTitle = `360° Review - ${new Date().toLocaleDateString()}`;
        // Standard 30-day deadline for 360 reviews
        const date360 = new Date();
        date360.setDate(date360.getDate() + 30);
        defaultDate = date360.toISOString().split('T')[0];
        break;
      case 'manager_effectiveness':
        defaultTitle = `Manager Survey - ${new Date().toLocaleDateString()}`;
        // Standard 30-day deadline for manager effectiveness
        const dateManager = new Date();
        dateManager.setDate(dateManager.getDate() + 30);
        defaultDate = dateManager.toISOString().split('T')[0];
        break;
      case 'manager_to_employee':
        defaultTitle = `Manager to Employee Feedback`;
        // Far future date for continuous feedback (10 years from now)
        const dateContinuous = new Date();
        dateContinuous.setFullYear(dateContinuous.getFullYear() + 10);
        defaultDate = dateContinuous.toISOString().split('T')[0];
        break;
      default:
        defaultTitle = `Review Cycle - ${new Date().toLocaleDateString()}`;
        const dateDefault = new Date();
        dateDefault.setDate(dateDefault.getDate() + 30);
        defaultDate = dateDefault.toISOString().split('T')[0];
    }
      
    setFormData(prev => ({
      ...prev,
      type: value,
      title: defaultTitle,
      review_by_date: defaultDate
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
                        <p className="max-w-xs">Choose the type of feedback collection that fits your needs.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                <RadioGroup
                  defaultValue={formData.type}
                  value={formData.type}
                  onValueChange={(value) => handleTypeChange(value as ReviewCycleType)}
                  className="grid grid-cols-1 gap-3"
                >
                  {(Object.keys(surveyTypeInfo) as ReviewCycleType[]).map((type) => {
                    const config = surveyTypeInfo[type];
                    const IconComponent = config.icon;
                    
                    return (
                      <div key={type} className="relative">
                        <RadioGroupItem
                          value={type}
                          id={`survey-type-${type}`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`survey-type-${type}`}
                          className={`flex cursor-pointer items-center justify-between rounded-lg border-2 p-4 transition-all ${config.color} peer-data-[state=checked]:border-primary peer-data-[state=checked]:shadow-sm`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                              <IconComponent className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{config.title}</span>
                                <Badge variant="outline" className="text-xs">
                                  {config.badge}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {config.description}
                              </p>
                            </div>
                          </div>
                          
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Info className="h-4 w-4" />
                                <span className="sr-only">View sample questions</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="end">
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm">Sample Questions</h4>
                                <div className="space-y-2">
                                  {config.questions.map((question, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                                      <p className="text-sm text-muted-foreground leading-relaxed">{question}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="title">
                  Title
                </label>
                <Input
                  id="title"
                  placeholder={
                    formData.type === '360_review' 
                      ? "Q4 2023 Performance Review" 
                      : formData.type === 'manager_effectiveness'
                      ? "2023 Manager Effectiveness Survey"
                      : "Manager to Employee Feedback"
                  }
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Only show review_by_date for structured review types */}
              {formData.type !== 'manager_to_employee' && (
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
              )}

              {/* Show explanation for continuous feedback */}
              {formData.type === 'manager_to_employee' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Continuous Feedback Cycle</h4>
                  <p className="text-sm text-blue-800 mb-2">
                    This cycle will allow ongoing feedback collection without a fixed end date. 
                    You'll be able to provide feedback continuously and generate reports for any time period.
                  </p>
                  <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                    <li>Add team members to start collecting feedback</li>
                    <li>Provide observations in real-time as they occur</li>
                    <li>Generate reports for custom time periods (weekly, monthly, quarterly)</li>
                    <li>Track feedback trends and progress over time</li>
                  </ul>
                </div>
              )}

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