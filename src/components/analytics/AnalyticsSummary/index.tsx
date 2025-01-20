import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function AnalyticsSummary() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Analytics Overview</CardTitle>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => navigate("/analytics")}
        >
          View Detailed Analytics
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {/* Simplified analytics view will go here */}
      </CardContent>
    </Card>
  );
} 