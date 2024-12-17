import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Copy, Plus, Star } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Employee {
  id: string;
  name: string;
  role: string;
}

interface FeedbackResponse {
  id: string;
  relationship: string;
  overall_rating: number;
  strengths: string;
  areas_for_improvement: string;
  submitted_at: string;
}

interface FeedbackRequest {
  id: string;
  employee_id: string;
  unique_link: string;
  status: string;
  employee: Employee;
  feedback: FeedbackResponse[];
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
      const { data: requests, error: requestsError } = await supabase
        .from('feedback_requests')
        .select(`
          id,
          employee_id,
          unique_link,
          status,
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

      if (requestsError) throw requestsError;

      const typedRequests: FeedbackRequest[] = (requests || []).map(request => ({
        id: request.id,
        employee_id: request.employee_id,
        unique_link: request.unique_link,
        status: request.status,
        employee: request.employee,
        feedback: request.feedback || []
      }));

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

  function renderStars(rating: number) {
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
      </div>
    );
  }

  if (isLoading) {
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
                  <div>
                    <p className="font-medium">{request.employee.name}</p>
                    <p className="text-sm text-muted-foreground">{request.employee.role}</p>
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

                {request.feedback && request.feedback.length > 0 ? (
                  <div className="mt-4">
                    <h3 className="mb-2 text-sm font-medium">Received Feedback</h3>
                    <div className="space-y-4">
                      {request.feedback.map((feedback) => (
                        <div key={feedback.id} className="rounded-lg bg-muted/50 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium">
                              From: {feedback.relationship}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(feedback.submitted_at).toLocaleDateString()}
                            </span>
                          </div>
                          {renderStars(feedback.overall_rating)}
                          <div className="mt-2 space-y-2 text-sm">
                            <div>
                              <span className="font-medium">Strengths: </span>
                              <span className="text-muted-foreground">{feedback.strengths}</span>
                            </div>
                            <div>
                              <span className="font-medium">Areas for Improvement: </span>
                              <span className="text-muted-foreground">{feedback.areas_for_improvement}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No feedback received yet
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 