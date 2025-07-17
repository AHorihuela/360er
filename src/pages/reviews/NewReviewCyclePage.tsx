import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SurveyTypeSelector } from './components/SurveyTypeSelector';
import { ContinuousFeedbackInfo } from './components/ContinuousFeedbackInfo';
import { useReviewCycleForm } from './hooks/useReviewCycleForm';

export function NewReviewCyclePage() {
  const {
    formData,
    isSubmitting,
    handleTypeChange,
    handleSubmit,
    handleCancel,
    updateFormData
  } = useReviewCycleForm();

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-4xl">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleCancel}>
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
              <SurveyTypeSelector
                selectedType={formData.type || '360_review'}
                onTypeChange={handleTypeChange}
              />

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
                  onChange={(e) => updateFormData({ title: e.target.value })}
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
                    onChange={(e) => updateFormData({ review_by_date: e.target.value })}
                    required
                  />
                </div>
              )}

              {/* Show explanation for continuous feedback */}
              {formData.type === 'manager_to_employee' && (
                <ContinuousFeedbackInfo />
              )}

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
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