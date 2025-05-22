import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";

export function MasterAccountViewToggle() {
  const { isMasterAccount, viewingAllAccounts, setViewingAllAccounts } = useAuth();
  const { toast } = useToast();

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

  if (!isMasterAccount) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Master Account View</CardTitle>
        <CardDescription>
          Control visibility of all user accounts' data across the app
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={viewingAllAccounts}
                onCheckedChange={handleToggleChange}
                id="global-master-view-toggle"
              />
              <Label htmlFor="global-master-view-toggle">
                View all user accounts
              </Label>
            </div>
            {viewingAllAccounts && (
              <Badge variant="outline" className="bg-amber-100">
                Active
              </Badge>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>When enabled:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
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