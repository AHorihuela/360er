import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { PlusIcon, Users, ChevronDown, Trash2, CalendarIcon } from 'lucide-react';
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

      console.log('Raw cycles data:', cyclesData);

      // For each review cycle, get the feedback request counts with status
      const cyclesWithCounts = await Promise.all(cyclesData.map(async (cycle) => {
        const { data: requests, error: requestsError } = await supabase
          .from('feedback_requests')
          .select(`
            id,
            status,
            feedback_responses (
              id
            )
          `)
          .eq('review_cycle_id', cycle.id);

        if (requestsError) {
          console.error('Error fetching feedback requests:', requestsError);
          return cycle;
        }

        console.log('Feedback requests for cycle:', cycle.id, requests);

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
      console.error('Error in fetchReviewCycles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch review cycles. Please refresh the page.",
        variant: "destructive",
      });
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
      console.log('Starting delete operation for cycle:', cycleId);
      setIsLoading(true);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Auth error:', userError);
        throw new Error('Authentication required');
      }
      
      // First verify the cycle exists and belongs to the current user
      const { data: existingCycle, error: checkError } = await supabase
        .from('review_cycles')
        .select('id, created_by')
        .eq('id', cycleId)
        .eq('created_by', user.id)
        .single();
      
      if (checkError) {
        console.error('Error checking cycle:', checkError);
        throw checkError;
      }

      if (!existingCycle) {
        throw new Error('Review cycle not found or you do not have permission to delete it');
      }

      console.log('Deleting cycle:', cycleId, 'created by:', existingCycle.created_by);
      
      // Delete feedback requests first (although cascade should handle this)
      const { error: requestsError } = await supabase
        .from('feedback_requests')
        .delete()
        .eq('review_cycle_id', cycleId);

      if (requestsError) {
        console.error('Error deleting feedback requests:', requestsError);
        throw requestsError;
      }

      // Then delete the review cycle
      const { data: deleteData, error: deleteError } = await supabase
        .from('review_cycles')
        .delete()
        .eq('id', cycleId)
        .eq('created_by', user.id) // Ensure we only delete if user owns it
        .select();

      if (deleteError) {
        console.error('Error deleting cycle:', deleteError);
        throw deleteError;
      }

      console.log('Delete response:', deleteData);

      if (!deleteData || deleteData.length === 0) {
        throw new Error('Failed to delete review cycle - no rows affected');
      }

      // Remove from local state first
      setReviewCycles(prev => prev.filter(cycle => cycle.id !== cycleId));
      
      // Then fetch fresh data
      await fetchReviewCycles();
      
      toast({
        title: "Success",
        description: "Review cycle and all related feedback deleted successfully",
      });
    } catch (error) {
      console.error('Error in handleDeleteCycle:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete review cycle. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {reviewCycles.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-background p-12 text-center">
              <h3 className="text-lg font-semibold mb-2">No Review Cycles</h3>
              <p className="text-muted-foreground mb-4">Get started by creating your first review cycle.</p>
              <Button onClick={() => setShowModal(true)}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Review Cycle
              </Button>
            </div>
          ) : (
            reviewCycles.map((cycle) => (
              <div
                key={cycle.id}
                className="group rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="space-y-1">
                      <h3 className="text-xl font-semibold">{cycle.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" />
                        Due by {new Date(cycle.review_by_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        cycle.status === 'active' 
                          ? 'default'
                          : cycle.status === 'completed'
                          ? 'secondary'
                          : 'outline'
                      }>
                        {cycle.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="rounded-lg border bg-background p-4">
                      <div className="text-sm font-medium text-muted-foreground mb-1">Total Reviewees</div>
                      <div className="text-2xl font-bold">{cycle._count?.total_feedback || 0}</div>
                    </div>
                    <div className="rounded-lg border bg-background p-4">
                      <div className="text-sm font-medium text-muted-foreground mb-1">Reviews Completed</div>
                      <div className="text-2xl font-bold text-green-600">{cycle._count?.completed_feedback || 0}</div>
                    </div>
                    <div className="rounded-lg border bg-background p-4">
                      <div className="text-sm font-medium text-muted-foreground mb-1">Pending Reviews</div>
                      <div className="text-2xl font-bold text-amber-600">{cycle._count?.pending_feedback || 0}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Completion Progress</span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round((cycle._count?.completed_feedback || 0) / (cycle._count?.total_feedback || 1) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <div 
                        className="h-2 rounded-full bg-primary transition-all duration-300" 
                        style={{ 
                          width: `${(cycle._count?.completed_feedback || 0) / (cycle._count?.total_feedback || 1) * 100}%` 
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-2">
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