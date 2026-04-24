import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface ProcurementApprovalThreshold {
  id: string;
  company_id: string | null;
  doc_type: string;
  cost_center_code: string | null;
  vendor_category: string | null;
  min_amount: number;
  max_amount: number | null;
  approver_roles: string[];
  approval_level: number;
  is_active: boolean;
  created_at: string;
}

export function useApprovalThresholds(docType?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const list = useQuery({
    queryKey: ['proc-thresholds', activeCompanyId, docType ?? 'all'],
    queryFn: async () => {
      let q: any = supabase.from('procurement_approval_thresholds' as any)
        .select('*').order('doc_type').order('approval_level').order('min_amount');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (docType) q = q.eq('doc_type', docType);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ProcurementApprovalThreshold[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: Partial<ProcurementApprovalThreshold> & { id?: string }) => {
      const payload = { ...row, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) };
      const { error } = await (supabase.from('procurement_approval_thresholds' as any).upsert(payload) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proc-thresholds'] });
      toast({ title: 'Threshold saved' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('procurement_approval_thresholds' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proc-thresholds'] });
      toast({ title: 'Threshold removed' });
    },
  });

  /**
   * Resolve the chain of approvers for a given doc.
   * Picks all rules where:
   *   doc_type matches AND amount in [min_amount, max_amount]
   *   AND (cost_center_code is null OR matches)
   *   AND (vendor_category is null OR matches)
   * Ordered by approval_level.
   */
  const resolveApprovers = (
    docType: string,
    amount: number,
    costCenter?: string,
    vendorCategory?: string,
  ): ProcurementApprovalThreshold[] => {
    return (list.data || [])
      .filter(r => r.doc_type === docType && r.is_active)
      .filter(r => amount >= r.min_amount && (r.max_amount === null || amount <= r.max_amount))
      .filter(r => !r.cost_center_code || r.cost_center_code === costCenter)
      .filter(r => !r.vendor_category || r.vendor_category === vendorCategory)
      .sort((a, b) => a.approval_level - b.approval_level);
  };

  return { ...list, upsert, remove, resolveApprovers };
}
