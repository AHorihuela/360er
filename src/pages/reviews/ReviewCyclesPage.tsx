import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { PlusIcon, Users, ChevronDown, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ReviewCycle {
  id: string;
  title: string;
  review_by_date: string;
  status: string;
  created_at: string;
  _count?: {
    pending_feedback: number;
    completed_feedback: number;
    total_feedback: number;
  };
}

interface CreateReviewCycleInput {
  title: string;
  review_by_date: string;
}

function CreateReviewCycleForm({ 
  onSubmit, 
  onCancel 
}: { 
  onSubmit: (data: CreateReviewCycleInput) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<CreateReviewCycleInput>({
    title: '',
    review_by_date: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting form with data:', formData);
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Title</label>
        <input
          type="text"
          required
          className="mt-1 w-full rounded-md border p-2"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Q1 2024 Performance Review"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Review by Date</label>
        <input
          type="date"
          required
          className="mt-1 w-full rounded-md border p-2"
          value={formData.review_by_date}
          onChange={(e) => setFormData({ ...formData, review_by_date: e.target.value })}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create Review Cycle</Button>
      </div>
    </form>
  );
}

export function ReviewCyclesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reviewCycles, setReviewCycles] = useState<ReviewCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchReviewCycles();
  }, []);

  async function fetchReviewCycles() {
    try {
      console.log('Fetching review cycles...');
      const { data: cyclesData, error: cyclesError } = await supabase
        .from('review_cycles')
        .select('*')
        .order('created_at', { ascending: false });

      if (cyclesError) {
        console.error('Error fetching review cycles:', cyclesError);
        throw cyclesError;
      }

      // For each review cycle, get the feedback request counts
      const cyclesWithCounts = await Promise.all(cyclesData.map(async (cycle) => {
        const { data: requests, error: requestsError } = await supabase
          .from('feedback_requests')
          .select('id, status')
          .eq('review_cycle_id', cycle.id);

        if (requestsError) {
          console.error('Error fetching feedback requests:', requestsError);
          return cycle;
        }

        const total = requests?.length || 0;
        const pending = requests?.filter(r => r.status === 'pending').length || 0;
        const completed = requests?.filter(r => r.status === 'completed').length || 0;

        return {
          ...cycle,
          _count: {
            total_feedback: total,
            pending_feedback: pending,
            completed_feedback: completed
          }
        };
      }));

      console.log('Fetched review cycles with counts:', cyclesWithCounts);
      setReviewCycles(cyclesWithCounts || []);
    } catch (error) {
      console.error('Error fetching review cycles:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateCycle(formData: CreateReviewCycleInput) {
    try {
      console.log('Creating review cycle with data:', formData);
      
      const { data, error } = await supabase
        .from('review_cycles')
        .insert([{
          title: formData.title,
          review_by_date: formData.review_by_date,
          status: 'active'
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Created review cycle:', data);
      setReviewCycles([data, ...reviewCycles]);
      setShowModal(false);
      toast({
        title: "Success",
        description: "Review cycle created successfully",
      });
    } catch (error) {
      console.error('Error creating review cycle:', error);
      toast({
        title: "Error",
        description: "Failed to create review cycle. Please try again.",
        variant: "destructive",
      });
    }
  }

  const handleManageReviewCycle = (cycleId: string) => {
    navigate(`/reviews/${cycleId}/manage`);
  };

  async function handleDeleteCycle(cycleId: string) {
    try {
      // First, delete all feedback responses for this cycle's feedback requests
      const { data: requests } = await supabase
        .from('feedback_requests')
        .select('id')
        .eq('review_cycle_id', cycleId);

      if (requests && requests.length > 0) {
        const requestIds = requests.map(r => r.id);
        await supabase
          .from('feedback_responses')
          .delete()
          .in('feedback_request_id', requestIds);
      }

      // Then delete all feedback requests for this cycle
      await supabase
        .from('feedback_requests')
        .delete()
        .eq('review_cycle_id', cycleId);

      // Finally delete the review cycle
      const { error } = await supabase
        .from('review_cycles')
        .delete()
        .eq('id', cycleId);

      if (error) throw error;

      setReviewCycles(reviewCycles.filter(cycle => cycle.id !== cycleId));
      toast({
        title: "Success",
        description: "Review cycle deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting review cycle:', error);
      toast({
        title: "Error",
        description: "Failed to delete review cycle. Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Review Cycles</h1>
        <Button onClick={() => setShowModal(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Create Review Cycle
        </Button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-4">
          {reviewCycles.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <p className="text-muted-foreground">No review cycles found</p>
            </div>
          ) : (
            reviewCycles.map((cycle) => (
              <details
                key={cycle.id}
                className="group rounded-lg border bg-card"
              >
                <summary className="flex cursor-pointer items-center justify-between p-6 [&::-webkit-details-marker]:hidden">
                  <div className="flex items-center gap-4">
                    <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
                    <div>
                      <h3 className="font-semibold">{cycle.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Due by {new Date(cycle.review_by_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                      cycle.status === 'active' 
                        ? 'bg-green-100 text-green-700'
                        : cycle.status === 'completed'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {cycle.status}
                    </span>
                  </div>
                </summary>
                <div className="border-t p-6">
                  <div className="space-y-4">
                    {cycle._count && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Progress:</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-gray-200">
                            <div 
                              className="h-2 rounded-full bg-green-500" 
                              style={{ 
                                width: `${(cycle._count.completed_feedback / cycle._count.total_feedback) * 100}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {Math.round((cycle._count.completed_feedback / cycle._count.total_feedback) * 100)}%
                            <span className="ml-1 text-muted-foreground">
                              ({cycle._count.completed_feedback} of {cycle._count.total_feedback} reviewers)
                            </span>
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Cycle
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Review Cycle</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this review cycle? This will permanently delete all feedback requests and responses associated with this cycle.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteCycle(cycle.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManageReviewCycle(cycle.id)}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Manage Reviewees
                      </Button>
                    </div>
                  </div>
                </div>
              </details>
            ))
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold">Create Review Cycle</h2>
            <CreateReviewCycleForm
              onSubmit={handleCreateCycle}
              onCancel={() => setShowModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
} 