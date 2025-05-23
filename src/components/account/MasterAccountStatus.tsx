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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";

interface MasterAccountStatusProps {
  user: User | null;
}

export function MasterAccountStatus({ user }: MasterAccountStatusProps) {
  const { isMasterAccount, viewingAllAccounts, setViewingAllAccounts } = useAuth();
  const { toast } = useToast();

  // Don't render anything if not a master account
  if (!isMasterAccount) return null;

  const explainMasterAccount = () => {
    toast({
      title: "Master Account Info",
      description: "Master accounts can view and manage review cycles from all user accounts in the system.",
      duration: 5000,
    });
  };

  // Update global state when the toggle changes
  const handleToggleChange = (checked: boolean) => {
    setViewingAllAccounts(checked);
    
    toast({
      title: checked ? "Master View Enabled" : "Master View Disabled",
      description: checked 
        ? "You can now see data from all user accounts across the app." 
        : "You are now only seeing your own account data.",
      duration: 3000,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Master Account Management</CardTitle>
        <CardDescription>
          Control your master account privileges and data visibility
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Account Status Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">Account Type:</span>
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                Master Account
              </Badge>
            </div>
            <button
              onClick={explainMasterAccount}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              What is this?
            </button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">As a master account, you can:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>View all review cycles from all user accounts</li>
              <li>Access all feedback data across the system</li>
              <li>Toggle between your own data and all system data</li>
            </ul>
          </div>
        </div>

        <Separator />

        {/* View Toggle Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                checked={viewingAllAccounts}
                onCheckedChange={handleToggleChange}
                id="global-master-view-toggle"
              />
              <Label htmlFor="global-master-view-toggle" className="font-medium">
                View all user accounts
              </Label>
            </div>
            {viewingAllAccounts && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800">
                Active
              </Badge>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">When enabled:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Dashboard will show all review cycles from all users</li>
              <li>Analytics will include data from all accounts</li>
              <li>Team members page will show employees from all users</li>
              <li>Reviews page will show all review cycles</li>
            </ul>
            <p className="mt-3 text-amber-600 font-medium">
              This setting applies across the entire application until you turn it off.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 