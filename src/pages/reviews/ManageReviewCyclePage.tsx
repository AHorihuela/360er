import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Copy, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

interface Employee {
  id: string;
  name: string;
  role: string;
}

interface FeedbackResponse {
  id: string;
  relationship: string;
  overall_rating: number;
  strengths: string | null;
  areas_for_improvement: string | null;
  submitted_at: string;
}

interface FeedbackRequest {
  id: string;
  review_cycle_id: string;
  employee_id: string;
  unique_link: string;
  status: 'pending' | 'completed';
  created_at: string;
  employee?: Employee;
  feedback?: FeedbackResponse[];
}

interface ReviewCycle {
  id: string;
  title: string;
  review_by_date: string;
  status: string;
}

export function ManageReviewCyclePage() {
  const { cycleId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [reviewCycle, setReviewCycle] = useState<ReviewCycle | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [feedbackRequests, setFeedbackRequests] = useState<FeedbackRequest[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  useEffect(() => {
    fetchData();
  }, [cycleId]);

  async function fetchData() {
    try {
      // Fetch review cycle details
      const { data: cycleData, error: cycleError } = await supabase
        .from('review_cycles')
        .select('*')
        .eq('id', cycleId)
        .single();

      if (cycleError) throw cycleError;
      setReviewCycle(cycleData);

      // Fetch all employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .order('name');

      if (employeesError) throw employeesError;
      setEmployees(employeesData);

      // Fetch existing feedback requests with feedback
      await fetchFeedbackRequests();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchFeedbackRequests() {
    try {
      const { data: requests, error } = await supabase
        .from('feedback_requests')
        .select(`
          id,
          review_cycle_id,
          employee_id,
          unique_link,
          status,
          created_at,
          employee:employees!inner (
            id,
            name,
            role
          ),
          feedback:feedback_responses (
            id,
            relationship,
            overall_rating,
            strengths,
            areas_for_improvement,
            submitted_at
          )
        `)
        .eq('review_cycle_id', cycleId);

      if (error) throw error;

      const typedRequests: FeedbackRequest[] = (requests || []).map(request => {
        const employeeData = Array.isArray(request.employee) ? request.employee[0] : request.employee;
        
        return {
          id: request.id,
          review_cycle_id: request.review_cycle_id,
          employee_id: request.employee_id,
          unique_link: request.unique_link,
          status: request.status as 'pending' | 'completed',
          created_at: request.created_at,
          employee: {
            id: employeeData?.id || '',
            name: employeeData?.name || '',
            role: employeeData?.role || ''
          },
          feedback: (request.feedback || []) as FeedbackResponse[]
        };
      });

      setFeedbackRequests(typedRequests);
    } catch (error) {
      console.error('Error fetching feedback requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch feedback requests",
        variant: "destructive",
      });
    }
  }

  async function handleAddEmployee() {
    if (!selectedEmployeeId) return;

    try {
      const uniqueLink = crypto.randomUUID();
      const { data, error } = await supabase
        .from('feedback_requests')
        .insert([{
          review_cycle_id: cycleId,
          employee_id: selectedEmployeeId,
          unique_link: uniqueLink,
          status: 'pending'
        }])
        .select('*, employee:employees(*)')
        .single();

      if (error) throw error;

      setFeedbackRequests([...feedbackRequests, data]);
      setSelectedEmployeeId('');
      toast({
        title: "Employee Added",
        description: "The employee has been added to the review cycle.",
      });
    } catch (error) {
      console.error('Error adding employee:', error);
      toast({
        title: "Error",
        description: "Failed to add employee to review cycle",
        variant: "destructive",
      });
    }
  }

  async function handleCopyLink(uniqueLink: string) {
    const feedbackUrl = `${window.location.origin}/feedback/${uniqueLink}`;
    await navigator.clipboard.writeText(feedbackUrl);
    toast({
      title: "Link Copied",
      description: "Feedback link has been copied to clipboard",
    });
  }

  if (isLoading || !reviewCycle) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/reviews')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Review Cycles
        </Button>
        <h1 className="text-2xl font-bold">{reviewCycle.title}</h1>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Add Employee to Review</h2>
        <div className="mt-4 flex gap-2">
          <select
            className="flex-1 rounded-md border p-2"
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
          >
            <option value="">Select an employee...</option>
            {employees
              .filter(emp => !feedbackRequests.some(req => req.employee_id === emp.id))
              .map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} - {emp.role}
                </option>
              ))}
          </select>
          <Button onClick={handleAddEmployee} disabled={!selectedEmployeeId}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Reviewees</h2>
        </div>
        <div className="divide-y">
          {feedbackRequests.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No employees added to this review cycle yet
            </div>
          ) : (
            feedbackRequests.map((request) => (
              <div key={request.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className="font-medium">{request.employee?.name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">{request.employee?.role || 'No role'}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyLink(request.unique_link)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Feedback Link
                  </Button>
                </div>

                {request.feedback?.length ? (
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Feedback Received ({request.feedback.length})</h4>
                      <Badge variant={request.status === 'completed' ? 'success' : 'secondary'}>
                        {request.status === 'completed' ? 'Completed' : 'Pending'}
                      </Badge>
                    </div>
                    <div className="grid gap-4">
                      {request.feedback.map((feedback) => (
                        <div key={feedback.id} className="rounded-lg border bg-muted/50 p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium capitalize">
                              {feedback.relationship.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(feedback.submitted_at).toLocaleDateString()}
                            </span>
                          </div>
                          {feedback.strengths && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Strengths</p>
                              <p className="text-sm">{feedback.strengths}</p>
                            </div>
                          )}
                          {feedback.areas_for_improvement && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Areas for Improvement</p>
                              <p className="text-sm">{feedback.areas_for_improvement}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-4">No feedback received yet</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 