import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

export function MasterAccountToggle() {
  const { isMasterAccount, viewingAllAccounts, setViewingAllAccounts } = useAuth();

  if (!isMasterAccount) return null;
  
  return (
    <div className="flex items-center gap-3">
      <Switch
        checked={viewingAllAccounts}
        onCheckedChange={setViewingAllAccounts}
        id="master-view-toggle"
      />
      <Label htmlFor="master-view-toggle" className="text-sm">
        View all accounts
      </Label>
      {viewingAllAccounts && (
        <Badge variant="outline" className="bg-amber-100 text-amber-800 text-xs">
          Master Mode
        </Badge>
      )}
    </div>
  );
} 