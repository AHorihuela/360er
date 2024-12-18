import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateReviewCycleInput } from '@/types/review';

export function NewReviewCyclePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<CreateReviewCycleInput, 'user_id'>>({
    title: '',
    review_by_date: '',
    status: 'active'
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
      } else {
        navigate('/login');
      }
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title || !formData.review_by_date || !userId) return;

    setIsSubmitting(true);
    try {
      const reviewCycleInput: CreateReviewCycleInput = {
        ...formData,
        user_id: userId
      };

      const { data, error } = await supabase
        .from('review_cycles')
        .insert([reviewCycleInput])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Review cycle created successfully",
      });

      navigate(`/reviews/${data.id}/manage`);
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
  }

  return (
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
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="title">
                Title
              </label>
              <Input
                id="title"
                placeholder="Q4 2023 Performance Review"
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
  );
} 