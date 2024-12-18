import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, ChevronRight, Calendar, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ReviewCycle } from '@/types/review';

export function ReviewCyclesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reviewCycles, setReviewCycles] = useState<ReviewCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  useEffect(() => {
    // Get the current user's ID
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        fetchReviewCycles(user.id);
      } else {
        navigate('/login');
      }
    });
  }, [navigate]);

  async function fetchReviewCycles(currentUserId: string) {
    try {
      const { data: reviewCyclesData, error: reviewCyclesError } = await supabase
        .from('review_cycles')
        .select(`
          *,
          feedback_requests!inner (
            id,
            status,
            employee:employees!inner (
              id,
              user_id
            )
          )
        `)
        .eq('user_id', currentUserId)
        .eq('feedback_requests.employee.user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (reviewCyclesError) throw reviewCyclesError;

      // Process the data to get the counts
      const processedCycles = reviewCyclesData?.map(cycle => ({
        ...cycle,
        _count: {
          feedback_requests: cycle.feedback_requests?.length || 0,
          completed_feedback: cycle.feedback_requests?.filter((r: { status: string }) => r.status === 'completed').length || 0
        }
      })) || [];

      setReviewCycles(processedCycles);
    } catch (error) {
      console.error('Error fetching review cycles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch review cycles",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(cycleId: string) {
    if (isDeletingId) return;

    try {
      setIsDeletingId(cycleId);
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
        description: "Failed to delete review cycle",
        variant: "destructive",
      });
    } finally {
      setIsDeletingId(null);
    }
  }

  function getStatusColor(status: string, dueDate: string) {
    const isOverdue = new Date(dueDate) < new Date();
    
    if (isOverdue && status !== 'completed') return 'destructive';
    return status === 'completed' ? 'default' : 'secondary';
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function calculateProgress(cycle: ReviewCycle): number {
    if (!cycle._count) return 0;
    const total = cycle._count.feedback_requests || 0;
    const completed = cycle._count.completed_feedback || 0;
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Review Cycles</h1>
        <Button onClick={() => navigate('/reviews/new-cycle')}>
          <Plus className="mr-2 h-4 w-4" />
          New Review Cycle
        </Button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : reviewCycles.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Review Cycles</CardTitle>
            <CardDescription>
              Get started by creating your first review cycle
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Button onClick={() => navigate('/reviews/new-cycle')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Review Cycle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reviewCycles.map((cycle) => (
            <Card key={cycle.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{cycle.title}</CardTitle>
                    <CardDescription className="mt-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="mr-2 h-4 w-4" />
                        Due {formatDate(cycle.review_by_date)}
                      </div>
                      <div className="flex items-center mt-1 text-sm text-muted-foreground">
                        <Users className="mr-2 h-4 w-4" />
                        {cycle._count?.feedback_requests || 0} reviewees
                      </div>
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusColor(cycle.status, cycle.review_by_date)}>
                    {cycle.status === 'completed' ? 'Completed' : 'In Progress'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress</span>
                    <span>{calculateProgress(cycle)}%</span>
                  </div>
                  <Progress value={calculateProgress(cycle)} className="h-2" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(cycle.id)}
                  disabled={isDeletingId === cycle.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/reviews/${cycle.id}/manage`)}
                >
                  Manage
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 