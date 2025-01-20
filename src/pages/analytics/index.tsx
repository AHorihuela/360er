import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type CompetencyFilters } from "@/components/analytics/CompetencyAnalysis/types";

export default function AnalyticsPage() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<CompetencyFilters>({
    employeeIds: [],
    relationships: [],
    cycleIds: [],
  });

  useEffect(() => {
    if (authState !== "Authenticated") {
      navigate("/login");
    }
  }, [authState, navigate]);

  if (authState !== "Authenticated") {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Analytics</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filter components will go here */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Competency Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Analysis components will go here */}
        </CardContent>
      </Card>
    </div>
  );
} 