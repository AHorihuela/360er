import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

interface MasterAccountToggleProps {
  viewingAllAccounts: boolean;
  setViewingAllAccounts: (checked: boolean) => void;
}

export function MasterAccountToggle({ 
  viewingAllAccounts, 
  setViewingAllAccounts 
}: MasterAccountToggleProps) {
  const { isMasterAccount } = useAuth();
  
  // Initialize from localStorage when component mounts
  useEffect(() => {
    if (isMasterAccount) {
      const savedState = localStorage.getItem('masterViewingAllAccounts');
      if (savedState !== null) {
        const storedValue = savedState === 'true';
        if (storedValue !== viewingAllAccounts) {
          console.log('[DEBUG] Restoring master view state from localStorage:', storedValue);
          setViewingAllAccounts(storedValue);
        }
      }
    }
  }, [isMasterAccount, setViewingAllAccounts]);
  
  // Reset viewingAllAccounts when isMasterAccount changes to false
  useEffect(() => {
    if (!isMasterAccount && viewingAllAccounts) {
      console.log('[DEBUG] Master account status changed, resetting viewing mode');
      setViewingAllAccounts(false);
      localStorage.removeItem('masterViewingAllAccounts');
    }
  }, [isMasterAccount, viewingAllAccounts, setViewingAllAccounts]);

  if (!isMasterAccount) return null;
  
  return (
    <div className="my-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Switch
          checked={viewingAllAccounts}
          onCheckedChange={(checked: boolean) => {
            console.log('[DEBUG] Master account toggle changed:', checked);
            setViewingAllAccounts(checked);
            localStorage.setItem('masterViewingAllAccounts', checked.toString());
          }}
          id="master-view-toggle"
        />
        <Label htmlFor="master-view-toggle">
          View all user accounts
        </Label>
      </div>
      {viewingAllAccounts && (
        <Badge variant="outline" className="ml-2 bg-amber-100">
          Master Account Mode
        </Badge>
      )}
    </div>
  );
} 