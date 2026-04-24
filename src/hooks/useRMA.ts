import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { approveRmaAndCreateCreditMemo } from '@/lib/sales/lifecycle';

export interface ARReturn {
  id: string;
  doc_num: number;
  doc_date: string;
  customer_code: string;
  customer_name: string;
  customer_id: string | null;
  return_reason: string | null;
  reference_delivery: string | null;
  base_doc_id: string | null;
  base_doc_type: string | null;
  total: number;
  currency: string;
  status: 'open' | 'approved' | 'received' | 'credited' | 'cancelled';
  approved_at: string | null;
  approved_by: string | null;
  credit_memo_id: string | null;
  remarks: string | null;
}

export function useRMAs(filterStatus?: ARReturn['status']) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const list = useQuery({
    queryKey: ['rmas', activeCompanyId, filterStatus ?? 'all'],
    queryFn: async () => {
      let q: any = supabase.from('ar_returns' as any).select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (filterStatus) q = q.eq('status', filterStatus);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ARReturn[];
    },
  });

  const approveAndCredit = useMutation({
    mutationFn: approveRmaAndCreateCreditMemo,
    onSuccess: (cmId) => {
      qc.invalidateQueries({ queryKey: ['rmas'] });
      qc.invalidateQueries({ queryKey: ['ar-credit-memos'] });
      toast({ title: 'RMA approved', description: `Credit memo ${cmId.slice(0, 8)}… created.` });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('ar_returns' as any).update({ status: 'cancelled' }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rmas'] });
      toast({ title: 'RMA cancelled' });
    },
  });

  return { ...list, approveAndCredit, cancel };
}

export function useCollectionsWorkbench() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['collections-workbench', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('v_collections_workbench' as any).select('*').order('total_overdue', { ascending: false }).limit(500) as any);
      if (error) throw error;
      return (data || []) as Array<{
        customer_id: string;
        card_code: string;
        card_name: string;
        approved_credit_limit: number | null;
        current_outstanding: number | null;
        risk_level: string | null;
        credit_status: string | null;
        total_open_ar: number;
        total_overdue: number;
        last_contact_at: string | null;
        open_promises: number;
        current_dunning_level: number | null;
      }>;
    },
  });
}
