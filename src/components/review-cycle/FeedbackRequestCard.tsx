import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Copy, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FeedbackRequest, REQUEST_STATUS } from '@/types/review'

interface FeedbackRequestCardProps {
  request: FeedbackRequest
  cycleId: string
  cycleType?: 'manager_to_employee' | 'manager_effectiveness' | '360_review'
  onDelete?: (request: FeedbackRequest) => void
  onCopyLink: (link: string) => void
  readOnly?: boolean
}

function determineRequestStatus(request: FeedbackRequest, cycleType?: string): string {
  const responseCount = request._count?.responses || 0
  
  // For manager-to-employee cycles, use different status logic
  if (cycleType === 'manager_to_employee') {
    if (responseCount > 0) return REQUEST_STATUS.IN_PROGRESS
    return 'ready' // Ready for feedback instead of pending
  }
  
  // For other cycle types, use traditional target-based logic
  if (!request.target_responses) return REQUEST_STATUS.PENDING
  
  // If we have more responses than target, mark as exceeded
  if (responseCount > request.target_responses) return REQUEST_STATUS.EXCEEDED
  // If we have exactly the target responses, mark as completed
  if (responseCount === request.target_responses) return REQUEST_STATUS.COMPLETED
  // If we have some responses but not enough, mark as in progress
  if (responseCount > 0) return REQUEST_STATUS.IN_PROGRESS
  // If we have no responses, mark as pending
  return REQUEST_STATUS.PENDING
}

export function FeedbackRequestCard({ 
  request, 
  cycleId, 
  cycleType,
  onDelete, 
  onCopyLink,
  readOnly = false 
}: FeedbackRequestCardProps) {
  const navigate = useNavigate()
  const responseCount = request._count?.responses || 0
  const targetResponses = request.target_responses || 1
  const completionPercentage = Math.min(Math.round((responseCount / targetResponses) * 100), 100)
  
  // Calculate recent feedback for M2E cycles (last 30 days)
  const getRecentFeedbackCount = () => {
    if (cycleType !== 'manager_to_employee' || !request.feedback_responses) {
      return responseCount;
    }
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return request.feedback_responses.filter(response => {
      const responseDate = new Date(response.submitted_at);
      return responseDate >= thirtyDaysAgo;
    }).length;
  };
  
  const recentFeedbackCount = getRecentFeedbackCount();
  const status = determineRequestStatus(request, cycleType)
  
  // Determine badge color and text based on status
  const getBadgeStyles = (status: string) => {
    switch (status) {
      case REQUEST_STATUS.EXCEEDED:
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20"
      case REQUEST_STATUS.COMPLETED:
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20"
      case REQUEST_STATUS.IN_PROGRESS:
        return "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20"
      case 'ready':
        return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
      default:
        return "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20"
    }
  }

  // Format status text
  const getStatusText = (status: string) => {
    if (status === REQUEST_STATUS.EXCEEDED) return 'completed'
    return status.toLowerCase().replace('_', ' ')
  }
  
  // Handle employee data that may come as an array from Supabase
  const employeeData = Array.isArray(request.employee) ? request.employee[0] : request.employee
  const employeeName = employeeData?.name || 'Unknown Employee'
  const employeeRole = employeeData?.role || 'No Role'
  const initials = employeeName !== 'Unknown Employee' 
    ? employeeName.split(' ').map((n: string) => n[0]).join('')
    : '??'
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card 
            className="group cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate(`/reviews/${cycleId}/employee/${request.employee_id}`)}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-[#FFF1F0] text-orange-500 text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-base truncate">{employeeName}</h3>
                  <p className="text-sm text-muted-foreground font-medium truncate">{employeeRole}</p>
                </div>
              </div>

              <div>
                {cycleType === 'manager_to_employee' ? (
                  // For manager-to-employee cycles, show recent feedback count
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">Last 30 Days</span>
                    <span className="text-sm font-medium">
                      {recentFeedbackCount} {recentFeedbackCount === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>
                ) : (
                  // For other cycle types, show traditional completion tracking
                  <>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium">Completion</span>
                      <span className="text-sm font-medium">
                        {responseCount}/{targetResponses}
                      </span>
                    </div>
                    <Progress 
                      value={completionPercentage}
                      className={cn(
                        "h-2 mb-3",
                        status === REQUEST_STATUS.COMPLETED || status === REQUEST_STATUS.EXCEEDED
                          ? "bg-green-500/20 [&>div]:bg-green-500"
                          : "bg-orange-500/20 [&>div]:bg-orange-500"
                      )}
                    />
                  </>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Badge 
                  variant="secondary"
                  className={cn("font-medium", getBadgeStyles(status))}
                >
                  {getStatusText(status)}
                </Badge>
                <div className="flex gap-2">
                  {/* Only show copy link button for cycles that use unique links (not manager-to-employee) */}
                  {cycleType !== 'manager_to_employee' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-accent"
                          onClick={(e) => {
                            e.stopPropagation()
                            onCopyLink(`${window.location.origin}/feedback/${request.unique_link}`)
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy feedback link</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
                  {/* Only show delete button if not readOnly and onDelete is provided */}
                  {!readOnly && onDelete && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-accent"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(request)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Remove employee</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent>
          <p>View detailed feedback progress</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 
