import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  PlusCircle,
  Users,
  BarChart3,
  Layers
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Current Review Cycle:</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Select 
            value={selectedCycleId || ''} 
            onValueChange={onCycleChange}
            key={`cycle-select-${allReviewCycles.length}-${viewingAllAccounts}-${isMasterAccount}`}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Select review cycle" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto">
              {getDisplayedCycles().map((cycle: ReviewCycle) => (
                <SelectItem key={cycle.id} value={cycle.id}>
                  {cycle.title}
                  {isMasterAccount && viewingAllAccounts && cycle.user_id !== currentUserId && (
                    <span className="ml-2 text-xs text-muted-foreground">(Other user)</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex flex-wrap gap-2">
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
      </div>
      
      {/* Display master account mode badge if viewing all accounts */}
      {isMasterAccount && viewingAllAccounts && (
        <div className="flex justify-end">
          <Badge variant="outline" className="bg-amber-100">
            Master Account Mode
          </Badge>
        </div>
      )}
    </div>
  );
} 