import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { AccountInfo } from '@/components/account/AccountInfo';
import { PasswordChange } from '@/components/account/PasswordChange';
import { AccountDeletion } from '@/components/account/AccountDeletion';

export function AccountPage() {
  const { user } = useAuth();

  return (
    <MainLayout>
      <div className="container max-w-2xl mx-auto py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="space-y-6">
          <AccountInfo user={user} />
          <PasswordChange />
          <AccountDeletion />
        </div>
      </div>
    </MainLayout>
  );
} 