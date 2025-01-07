import { User } from '@supabase/supabase-js';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AccountInfoProps {
  user: User | null;
}

export function AccountInfo({ user }: AccountInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Information</CardTitle>
        <CardDescription>Your basic account details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Email</label>
          <Input value={user?.email || ''} disabled />
        </div>
        <div>
          <label className="text-sm font-medium">Last Sign In</label>
          <Input 
            value={user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'} 
            disabled 
          />
        </div>
      </CardContent>
    </Card>
  );
} 