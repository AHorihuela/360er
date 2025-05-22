import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { AccountInfo } from '@/components/account/AccountInfo';
import { PasswordChange } from '@/components/account/PasswordChange';
import { AccountDeletion } from '@/components/account/AccountDeletion';
import { MasterAccountStatus } from '@/components/account/MasterAccountStatus';
import { MasterAccountViewToggle } from '@/components/account/MasterAccountViewToggle';

export function AccountPage() {
  const { user, isMasterAccount } = useAuth();

  return (
    <MainLayout>
      <div className="container max-w-2xl mx-auto py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Data Management</h1>
          <p className="text-muted-foreground">
            Manage your data and preferences
          </p>
        </div>

        <div className="space-y-6">
          <AccountInfo user={user} />
          {isMasterAccount && (
            <>
              <MasterAccountStatus user={user} />
              <MasterAccountViewToggle />
            </>
          )}
          <PasswordChange />
          <AccountDeletion />
        </div>
      </div>
    </MainLayout>
  );
} 