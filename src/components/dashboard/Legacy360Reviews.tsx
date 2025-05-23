import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  ArrowUpIcon,
  EqualIcon,
  ArrowDownIcon,
  StarIcon,
  TrendingUpIcon
} from 'lucide-react';
import { DashboardEmployee, ReviewCycleWithFeedback } from '@/types/feedback/dashboard';

interface Legacy360ReviewsProps {
  activeReviewCycle: ReviewCycleWithFeedback;
  employees: DashboardEmployee[];
}

export function Legacy360Reviews({ activeReviewCycle, employees }: Legacy360ReviewsProps) {
  const navigate = useNavigate();
  const [visibleReviews, setVisibleReviews] = useState<number>(4);

  return (
    <div className="space-y-4 mt-8 pt-8 border-t">
      <h2 className="text-xl font-semibold">Recent Reviews</h2>
      <div className="grid gap-6 md:grid-cols-2">
        {activeReviewCycle.feedback_requests
          .flatMap(fr => (fr.feedback_responses || []).map(response => ({
            ...response,
            employee_id: fr.employee_id
          })))
          .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
          .slice(0, visibleReviews)
          .map((response) => {
            // Find the employee from the employees array
            const employee = employees.find(e => e.id === response.employee_id);
            if (!employee) return null;

            return (
              <Card 
                key={response.id}
                className={cn(
                  "hover:shadow-lg transition-all duration-300 cursor-pointer",
                  response.relationship === 'senior_colleague' && 'border-blue-100',
                  response.relationship === 'equal_colleague' && 'border-green-100',
                  response.relationship === 'junior_colleague' && 'border-purple-100'
                )}
                onClick={() => navigate(`/reviews/${activeReviewCycle.id}/employee/${response.employee_id}`)}
              >
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                        <AvatarFallback>
                          {employee.name.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-sm sm:text-base">{employee.name}</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm text-muted-foreground">{employee.role}</p>
                          <Badge variant="outline" className={cn(
                            "text-xs capitalize flex items-center gap-1",
                            response.relationship === 'senior_colleague' && 'bg-blue-50 border-blue-200',
                            response.relationship === 'equal_colleague' && 'bg-green-50 border-green-200',
                            response.relationship === 'junior_colleague' && 'bg-purple-50 border-purple-200'
                          )}>
                            {response.relationship === 'senior_colleague' && <ArrowUpIcon className="h-3 w-3" />}
                            {response.relationship === 'equal_colleague' && <EqualIcon className="h-3 w-3" />}
                            {response.relationship === 'junior_colleague' && <ArrowDownIcon className="h-3 w-3" />}
                            {response.relationship.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">
                        {new Date(response.submitted_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1 block">
                        Review #{employee.completed_reviews}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 mt-4">
                    {response.strengths && (
                      <div className="bg-slate-50 p-3 rounded-md">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <StarIcon className="h-4 w-4 text-yellow-500" />
                          Strengths
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {response.strengths}
                        </p>
                      </div>
                    )}
                    {response.areas_for_improvement && (
                      <div className="bg-slate-50 p-3 rounded-md">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <TrendingUpIcon className="h-4 w-4 text-blue-500" />
                          Areas for Improvement
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {response.areas_for_improvement}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex justify-end">
                    {employee.completed_reviews === 1 && (
                      <Badge variant="secondary" className="text-xs">First Review</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
          .filter(Boolean)
        }
      </div>
      {activeReviewCycle.feedback_requests
        .flatMap(fr => fr.feedback_responses || [])
        .length > visibleReviews && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            onClick={() => setVisibleReviews(prev => prev + 4)}
            className="w-full sm:w-auto"
          >
            Load More Reviews
          </Button>
        </div>
      )}
    </div>
  );
} 