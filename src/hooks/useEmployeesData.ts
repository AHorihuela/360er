import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { type DashboardEmployee } from '@/types/feedback/dashboard';

/**
 * Custom hook for managing employees data
 * @param userId - Current user ID
 * @param isMasterAccount - Whether the user has master account privileges
 * @param viewingAllAccounts - Whether viewing all accounts in master mode
 */
export function useEmployeesData(userId: string | undefined, isMasterAccount: boolean, viewingAllAccounts: boolean) {
  const { toast } = useToast();
  const [employeesData, setEmployeesData] = useState<DashboardEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchEmployeesData = async (): Promise<DashboardEmployee[]> => {
    if (!userId) return [];

    try {
      setIsLoading(true);
      
      let employeeQuery = supabase
        .from('employees')
        .select('*');
      
      const shouldFilterByUser = !isMasterAccount || !viewingAllAccounts;
      
      if (shouldFilterByUser) {
        employeeQuery = employeeQuery.eq('user_id', userId);
      }
      
      const { data: employees, error } = await employeeQuery;

      if (error) {
        console.error('[EMPLOYEES] Error fetching employees:', error);
        toast({
          title: 'Error fetching employees',
          description: error.message,
          variant: 'destructive',
        });
        return [];
      }

      const employeesData = (employees as DashboardEmployee[]) || [];
      setEmployeesData(employeesData);
      return employeesData;
    } catch (error) {
      console.error('[EMPLOYEES] Critical error in fetchEmployeesData:', error);
      toast({
        title: 'Error loading employees',
        description: 'Please try refreshing the page',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    employeesData,
    isLoading,
    fetchEmployeesData
  };
} 