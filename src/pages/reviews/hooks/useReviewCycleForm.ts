import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { CreateReviewCycleInput } from '@/types/review';
import { ReviewCycleType } from '@/types/survey';
import { getDefaultFormData } from '../components/surveyTypeConfig';

export function useReviewCycleForm() {
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
    type: '360_review'
  });

  const handleTypeChange = (value: ReviewCycleType) => {
    const { defaultTitle, defaultDate } = getDefaultFormData(value);
    
    setFormData(prev => ({
      ...prev,
      type: value,
      title: defaultTitle,
      review_by_date: defaultDate
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      setIsSubmitting(true);

      const { data, error: cycleError } = await supabase
        .from('review_cycles')
        .insert({
          title: formData.title,
          review_by_date: formData.review_by_date,
          user_id: user.id,
          status: 'active',
          type: formData.type || '360_review'
        })
        .select()
        .single();

      if (cycleError) throw cycleError;

      toast({
        title: "Success",
        description: "Review cycle created successfully",
      });

      navigate(`/reviews/${data.id}?new=true`);
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

  const handleCancel = () => {
    navigate('/reviews');
  };

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  return {
    formData,
    isSubmitting,
    handleTypeChange,
    handleSubmit,
    handleCancel,
    updateFormData
  };
} 