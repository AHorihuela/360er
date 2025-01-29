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
  onDelete: (request: FeedbackRequest) => void
  onCopyLink: (link: string) => void
}

function determineRequestStatus(request: FeedbackRequest): string {
  if (!request.target_responses) return REQUEST_STATUS.PENDING
  const responseCount = request._count?.responses || 0
  
  // If we have more responses than target, mark as exceeded
  if (responseCount > request.target_responses) return REQUEST_STATUS.EXCEEDED
  // If we have exactly the target responses, mark as completed
  if (responseCount === request.target_responses) return REQUEST_STATUS.COMPLETED
  // If we have some responses but not enough, mark as in progress
  if (responseCount > 0) return REQUEST_STATUS.IN_PROGRESS
  // If we have no responses, mark as pending
  return REQUEST_STATUS.PENDING
}

export function FeedbackRequestCard({ request, cycleId, onDelete, onCopyLink }: FeedbackRequestCardProps) {
  const navigate = useNavigate()
  const responseCount = request._count?.responses || 0
  const targetResponses = request.target_responses || 1
  const completionPercentage = Math.min(Math.round((responseCount / targetResponses) * 100), 100)
  const status = determineRequestStatus(request)
  
  // Determine badge color and text based on status
  const getBadgeStyles = (status: string) => {
    switch (status) {
      case REQUEST_STATUS.EXCEEDED:
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20"
      case REQUEST_STATUS.COMPLETED:
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20"
      case REQUEST_STATUS.IN_PROGRESS:
        return "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20"
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
              </div>

              <div className="flex items-center justify-between">
                <Badge 
                  variant="secondary"
                  className={cn("font-medium", getBadgeStyles(status))}
                >
                  {getStatusText(status)}
                </Badge>
                <div className="flex gap-2">
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
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
