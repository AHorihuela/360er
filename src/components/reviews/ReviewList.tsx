import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function ReviewList() {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-4">
      {/* Other review list content */}
      <div className="mt-4">
        <Button 
          variant="outline"
          onClick={() => navigate('/reviews')}
          className="w-full"
        >
          View All Reviews
        </Button>
      </div>
    </div>
  );
} 