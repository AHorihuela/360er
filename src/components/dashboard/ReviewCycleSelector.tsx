import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  PlusCircle,
  Users,
  BarChart3,
  Layers,
  Calendar
} from 'lucide-react';
import { ReviewCycle } from '@/types/review';

interface ReviewCycleSelectorProps {
  selectedCycleId: string | null;
  allReviewCycles: ReviewCycle[];
  activeReviewCycle: { id: string } | null;
  onCycleChange: (cycleId: string) => void;
  isMasterAccount: boolean;
  viewingAllAccounts: boolean;
  currentUserId: string;
}

// Helper function to truncate text and provide full text in tooltip
function TruncatedText({ text, maxLength = 50 }: { text: string; maxLength?: number }) {
  if (text.length <= maxLength) {
    return <span>{text}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">
            {text.substring(0, maxLength)}...
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-[300px] whitespace-pre-wrap">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ReviewCycleSelector({
  selectedCycleId,
  allReviewCycles,
  activeReviewCycle,
  onCycleChange,
  isMasterAccount,
  viewingAllAccounts,
  currentUserId
}: ReviewCycleSelectorProps) {
  const navigate = useNavigate();

  const getDisplayedCycles = () => {
    if (!allReviewCycles.length) return [];
    return allReviewCycles;
  };

  return (
    <div className="flex flex-col space-y-4 md:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        
        {/* Action Buttons - now at the top right */}
        <div className="flex flex-wrap gap-2 lg:order-last">
          {activeReviewCycle && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(`/reviews/${activeReviewCycle.id}`)}
              className="whitespace-nowrap flex items-center gap-1"
            >
              <ExternalLink className="h-4 w-4" />
              View Cycle
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/reviews')}
            className="whitespace-nowrap flex items-center gap-1"
          >
            <Layers className="h-4 w-4" />
            All Reviews
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/employees')}
            className="whitespace-nowrap flex items-center gap-1"
          >
            <Users className="h-4 w-4" />
            Team Members
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/analytics')}
            className="whitespace-nowrap flex items-center gap-1"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Button>
          
          <Button 
            onClick={() => navigate('/reviews/new-cycle')}
            size="sm"
            className="whitespace-nowrap"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Review Cycle
          </Button>
        </div>
      </div>

      {/* Review Cycle Selection Section - now gets full width */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Current Review Cycle:</span>
        </div>
        
        <Select 
          value={selectedCycleId || ''} 
          onValueChange={onCycleChange}
          key={`cycle-select-${allReviewCycles.length}-${viewingAllAccounts}-${isMasterAccount}`}
        >
          <SelectTrigger className="w-full sm:w-auto sm:min-w-[300px] sm:max-w-[500px]">
            <SelectValue placeholder="Select review cycle" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] overflow-y-auto max-w-[600px]">
            {getDisplayedCycles().map((cycle: ReviewCycle) => (
              <SelectItem key={cycle.id} value={cycle.id} className="max-w-[580px]">
                <div className="flex items-center justify-between w-full">
                  <TruncatedText text={cycle.title} maxLength={60} />
                  {isMasterAccount && viewingAllAccounts && cycle.user_id !== currentUserId && (
                    <Badge variant="outline" className="ml-2 text-xs bg-amber-100 text-amber-800">
                      Other user
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
} 