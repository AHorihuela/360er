import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";

interface MasterAccountStatusProps {
  user: User | null;
}

export function MasterAccountStatus({ user }: MasterAccountStatusProps) {
  const { isMasterAccount } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const explainMasterAccount = () => {
    toast({
      title: "Master Account Info",
      description: "Master accounts can view and manage review cycles from all user accounts in the system.",
      duration: 5000,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Master Account Status</CardTitle>
        <CardDescription>
          View your account access level
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="mr-2">Account Type:</span>
            {isMasterAccount ? (
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                Master Account
              </Badge>
            ) : (
              <Badge variant="outline">
                Standard Account
              </Badge>
            )}
          </div>
          <button
            onClick={explainMasterAccount}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            What is this?
          </button>
        </div>

        {isMasterAccount && (
          <div className="text-sm text-muted-foreground">
            <p>As a master account, you can:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>View all review cycles from all user accounts</li>
              <li>Access all feedback data across the system</li>
              <li>Toggle between your own data and all system data</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 