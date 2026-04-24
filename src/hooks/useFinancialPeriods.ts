import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface FinancialPeriod {
  id: string;
  period_name: string;
  period_code: string;
  fiscal_year: number;
  period_number: number;
  start_date: string;
  end_date: string;
  status: string;
  locked_by: string | null;
  locked_at: string | null;
  closed_by: string | null;
  closed_at: string | null;
  company_id: string | null;
  created_at: string;
}

export function useFinancialPeriods() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ['financial-periods', activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('financial_periods')
        .select('*')
        .order('fiscal_year', { ascending: false })
        .order('period_number');
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as FinancialPeriod[];
    },
  });

  const generatePeriods = useMutation({
    mutationFn: async (year: number) => {
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];

      const periodsData = months.map((m, i) => {
        const startDate = new Date(year, i, 1);
        const endDate = new Date(year, i + 1, 0);
        return {
          period_name: `${m} ${year}`,
          period_code: `${year}-${String(i + 1).padStart(2, '0')}`,
          fiscal_year: year,
          period_number: i + 1,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          status: 'open',
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        };
      });

      const { error } = await supabase.from('financial_periods').upsert(periodsData, {
        onConflict: 'fiscal_year,period_number,company_id',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-periods'] });
      toast({ title: 'Periods Generated', description: '12 monthly periods created' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updatePeriodStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'locked') {
        updates.locked_by = user?.id;
        updates.locked_at = new Date().toISOString();
      } else if (status === 'closed') {
        updates.closed_by = user?.id;
        updates.closed_at = new Date().toISOString();
      } else if (status === 'open') {
        updates.locked_by = null;
        updates.locked_at = null;
        updates.closed_by = null;
        updates.closed_at = null;
      }
      const { error } = await supabase.from('financial_periods').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-periods'] });
      toast({ title: 'Period Updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const closeYear = useMutation({
    mutationFn: async (year: number) => {
      const yearPeriods = periods.filter(p => p.fiscal_year === year);
      for (const p of yearPeriods) {
        await supabase.from('financial_periods').update({
          status: 'closed',
          closed_by: user?.id,
          closed_at: new Date().toISOString(),
        }).eq('id', p.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-periods'] });
      toast({ title: 'Year Closed', description: 'All periods for the year have been closed' });
    },
  });

  return {
    periods,
    isLoading,
    generatePeriods,
    updatePeriodStatus,
    closeYear,
  };
}
