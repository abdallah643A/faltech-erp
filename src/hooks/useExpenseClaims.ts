import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ExpenseClaim {
  id: string;
  employee_id: string;
  claim_number: string;
  claim_date: string;
  category: string;
  description: string | null;
  amount: number;
  currency: string | null;
  receipt_url: string | null;
  status: string;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  employee?: { id: string; first_name: string; last_name: string; employee_code: string } | null;
  reviewer?: { id: string; first_name: string; last_name: string } | null;
}

export interface ExpenseClaimLine {
  id: string;
  expense_claim_id: string;
  line_num: number;
  description: string;
  category: string | null;
  amount: number;
  receipt_url: string | null;
  expense_date: string | null;
  created_at: string;
}

export function useExpenseClaims(employeeId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['expense-claims', employeeId],
    queryFn: async () => {
      let query = supabase
        .from('expense_claims')
        .select(`
          *,
          employee:employees!expense_claims_employee_id_fkey(id, first_name, last_name, employee_code),
          reviewer:employees!expense_claims_reviewed_by_fkey(id, first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (employeeId) query = query.eq('employee_id', employeeId);
      const { data, error } = await query;
      if (error) throw error;
      return data as ExpenseClaim[];
    },
  });

  const createClaim = useMutation({
    mutationFn: async (claim: {
      employee_id: string;
      category: string;
      description?: string;
      amount: number;
      claim_date?: string;
    }) => {
      const claimNumber = 'EXP-' + Date.now().toString(36).toUpperCase();
      const { data, error } = await supabase
        .from('expense_claims')
        .insert({ ...claim, claim_number: claimNumber })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-claims'] });
      toast({ title: 'Expense claim created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating claim', description: error.message, variant: 'destructive' });
    },
  });

  const updateClaim = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ExpenseClaim> & { id: string }) => {
      const { data, error } = await supabase
        .from('expense_claims')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-claims'] });
      toast({ title: 'Expense claim updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating claim', description: error.message, variant: 'destructive' });
    },
  });

  return { claims, isLoading, createClaim, updateClaim };
}
