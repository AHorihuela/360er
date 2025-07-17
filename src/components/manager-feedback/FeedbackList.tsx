import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  MessageSquare,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { format, subDays, isWithinInterval } from 'date-fns';
import { FeedbackResponse, Employee } from '@/types/review';
import { useManagerFeedback } from '@/hooks/useManagerFeedback';
import { useAuth } from '@/hooks/useAuth';
import { FeedbackEntryCard } from './FeedbackEntryCard';

// Extended interface for feedback with joined request data
interface FeedbackWithRequest extends FeedbackResponse {
  feedback_requests: {
    review_cycle_id: string;
    employee_id: string;
  };
}

interface FeedbackListProps {
  reviewCycleId: string;
  employees: Employee[];
  onFeedbackUpdate?: () => void;
}

type SortOption = 'newest' | 'oldest' | 'employee';
type FilterOption = 'all' | 'last7days' | 'last30days' | 'specific_employee';

export function FeedbackList({ 
  reviewCycleId, 
  employees,
  onFeedbackUpdate 
}: FeedbackListProps) {
  const { user } = useAuth();
  const { getCycleFeedback, isLoading } = useManagerFeedback({ 
    userId: user?.id, 
    reviewCycleId 
  });

  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackWithRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch feedback entries
  useEffect(() => {
    const fetchFeedback = async () => {
      if (reviewCycleId) {
        const feedback = await getCycleFeedback();
        // Cast to include joined data which is returned by getCycleFeedback
        setFeedbackEntries(feedback as FeedbackWithRequest[]);
      }
    };

    fetchFeedback();
  }, [reviewCycleId, getCycleFeedback, refreshTrigger]);

  // Handle feedback update
  const handleFeedbackUpdate = (feedbackId: string) => {
    setRefreshTrigger(prev => prev + 1);
    onFeedbackUpdate?.();
  };

  // Handle feedback deletion
  const handleFeedbackDelete = (feedbackId: string) => {
    setFeedbackEntries(prev => prev.filter(entry => entry.id !== feedbackId));
    onFeedbackUpdate?.();
  };

  // Get employee by ID helper
  const getEmployeeById = (employeeId: string) => {
    return employees.find(emp => emp.id === employeeId);
  };

  // Filter and sort feedback entries
  const filteredAndSortedFeedback = useMemo(() => {
    let filtered = feedbackEntries;

    // Apply text search
    if (searchTerm) {
      filtered = filtered.filter(entry => {
        const employee = getEmployeeById(entry.feedback_requests.employee_id || '');
        const content = (entry.strengths || entry.areas_for_improvement || '').toLowerCase();
        const employeeName = employee?.name.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        
        return content.includes(search) || employeeName.includes(search);
      });
    }

    // Apply date filter
    if (filterBy === 'last7days') {
      const sevenDaysAgo = subDays(new Date(), 7);
      filtered = filtered.filter(entry => 
        isWithinInterval(new Date(entry.submitted_at), { start: sevenDaysAgo, end: new Date() })
      );
    } else if (filterBy === 'last30days') {
      const thirtyDaysAgo = subDays(new Date(), 30);
      filtered = filtered.filter(entry => 
        isWithinInterval(new Date(entry.submitted_at), { start: thirtyDaysAgo, end: new Date() })
      );
    }

    // Apply employee filter
    if (filterBy === 'specific_employee' && selectedEmployeeId) {
      filtered = filtered.filter(entry => 
        entry.feedback_requests.employee_id === selectedEmployeeId
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
        case 'employee':
          const employeeA = getEmployeeById(a.feedback_requests.employee_id || '');
          const employeeB = getEmployeeById(b.feedback_requests.employee_id || '');
          return (employeeA?.name || '').localeCompare(employeeB?.name || '');
        case 'newest':
        default:
          return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
      }
    });

    return filtered;
  }, [feedbackEntries, searchTerm, sortBy, filterBy, selectedEmployeeId, employees]);

  // Group feedback by employee for analytics
  const feedbackByEmployee = useMemo(() => {
    const groups: { [key: string]: FeedbackWithRequest[] } = {};
    filteredAndSortedFeedback.forEach(entry => {
      const employeeId = entry.feedback_requests.employee_id || 'unknown';
      if (!groups[employeeId]) {
        groups[employeeId] = [];
      }
      groups[employeeId].push(entry);
    });
    return groups;
  }, [filteredAndSortedFeedback]);

  const totalFeedback = feedbackEntries.length;
  const filteredCount = filteredAndSortedFeedback.length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading feedback entries...</p>
        </CardContent>
      </Card>
    );
  }

  if (totalFeedback === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Feedback Yet</h3>
          <p className="text-muted-foreground">
            Start providing feedback for your team members to see entries here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header and Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Feedback Entries
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{totalFeedback} Total</Badge>
                {filteredCount !== totalFeedback && (
                  <Badge variant="secondary">{filteredCount} Filtered</Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search feedback or employee names..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  {sortBy === 'newest' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="employee">By Employee</SelectItem>
              </SelectContent>
            </Select>

            {/* Time Filter */}
            <Select value={filterBy} onValueChange={(value: FilterOption) => {
              setFilterBy(value);
              if (value !== 'specific_employee') {
                setSelectedEmployeeId('');
              }
            }}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="last30days">Last 30 Days</SelectItem>
                <SelectItem value="specific_employee">Specific Employee</SelectItem>
              </SelectContent>
            </Select>

            {/* Employee Filter */}
            {filterBy === 'specific_employee' && (
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <SelectValue placeholder="Select employee..." />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feedback Entries */}
      <div className="space-y-4">
        {filteredCount === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                No feedback entries match your current filters.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterBy('all');
                  setSelectedEmployeeId('');
                  setSortBy('newest');
                }}
                className="mt-2"
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedFeedback.map((feedback) => {
            const employee = getEmployeeById(feedback.feedback_requests.employee_id || '');
            
            if (!employee) {
              return null; // Skip if employee not found
            }

            return (
              <FeedbackEntryCard
                key={feedback.id}
                feedback={feedback}
                employee={employee}
                reviewCycleId={reviewCycleId}
                onUpdate={handleFeedbackUpdate}
                onDelete={handleFeedbackDelete}
              />
            );
          })
        )}
      </div>

      {/* Summary Stats */}
      {Object.keys(feedbackByEmployee).length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Feedback Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {Object.entries(feedbackByEmployee).map(([employeeId, entries]) => {
                const employee = getEmployeeById(employeeId);
                if (!employee) return null;
                
                return (
                  <div key={employeeId} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm font-medium truncate">{employee.name}</span>
                    <Badge variant="outline" className="text-xs ml-2">
                      {entries.length}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 