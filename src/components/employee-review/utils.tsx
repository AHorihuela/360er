import { Badge } from '@/components/ui/badge';
import { ReviewCycleType } from '@/types/survey';

export function getStatusVariant(status?: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'completed':
      return 'default';
    case 'in_progress':
      return 'secondary';
    case 'exceeded':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function formatStatusText(status?: string): string {
  switch (status) {
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'exceeded':
      return 'Exceeded';
    case 'pending':
      return 'Pending';
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  }
}

export function getSurveyTypeBadge(type?: ReviewCycleType) {
  if (type === 'manager_effectiveness') {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        Manager Survey
      </Badge>
    );
  } else if (type === 'manager_to_employee') {
    return (
      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
        Manager to Employee Feedback
      </Badge>
    );
  } else {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        360° Feedback
      </Badge>
    );
  }
} 