import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const CONFIRMATION_WORD = 'DELETE';

export function AccountDeletion() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationWord, setConfirmationWord] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAccountDeletion = async () => {
    if (confirmationWord !== CONFIRMATION_WORD) {
      toast({
        title: 'Error',
        description: `Please type ${CONFIRMATION_WORD} to confirm deletion`,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Delete all user data
      const { error: dataError } = await supabase.rpc('delete_user_account');
      if (dataError) throw dataError;

      // Sign out the user
      await supabase.auth.signOut();
      
      toast({
        title: 'Account Deleted',
        description: 'Your account has been permanently deleted.',
      });

      // Navigate after a short delay to allow the toast to be seen
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error: any) {
      console.error('Account deletion error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete account. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setConfirmationWord('');
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle>Delete All My Data</CardTitle>
        <CardDescription>Permanently delete all your data from the platform</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Once you delete your data, there is no going back. This action is permanent and will:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Delete all your feedback responses</li>
            <li>Delete all AI reports and analytics</li>
            <li>Remove all your employees and review cycles</li>
            <li>Remove all data associated with your account</li>
          </ul>
          <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isLoading} className="w-full">
                Delete All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      This action cannot be undone. This will permanently delete all your data
                      from our servers.
                    </div>
                    <div className="space-y-2">
                      <div className="font-medium">
                        Type {CONFIRMATION_WORD} to confirm deletion:
                      </div>
                      <Input
                        value={confirmationWord}
                        onChange={(e) => setConfirmationWord(e.target.value.toUpperCase())}
                        placeholder={`Type ${CONFIRMATION_WORD} here`}
                        className="font-mono"
                      />
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleDialogClose}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleAccountDeletion}
                  className={`bg-destructive text-destructive-foreground hover:bg-destructive/90 ${
                    confirmationWord !== CONFIRMATION_WORD ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={confirmationWord !== CONFIRMATION_WORD || isLoading}
                >
                  {isLoading ? 'Deleting...' : 'Delete All Data'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
} 