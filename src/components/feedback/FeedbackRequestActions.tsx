import { Button } from "@/components/ui/button";
import { Copy, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FeedbackRequestActionsProps {
  reviewCycleId: string;
  employeeId: string;
  feedbackLink: string;
}

export function FeedbackRequestActions({ reviewCycleId, employeeId, feedbackLink }: FeedbackRequestActionsProps) {
  const navigate = useNavigate();

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(feedbackLink);
  };

  return (
    <div className="flex gap-4">
      <Button
        variant="outline"
        className="bg-white hover:bg-black hover:text-white transition-colors"
        onClick={handleCopyLink}
      >
        <Copy className="mr-2 h-4 w-4" />
        Copy Feedback Link
      </Button>
      <Button
        variant="outline"
        className="bg-white hover:bg-black hover:text-white transition-colors"
        onClick={() => navigate(`/reviews/${reviewCycleId}/feedback/${employeeId}/report`)}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        See AI Report
      </Button>
    </div>
  );
} 