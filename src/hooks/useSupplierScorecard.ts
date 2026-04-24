import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useToast } from '@/hooks/use-toast';
import { recalcSupplierScorecard } from '@/lib/procurement/lifecycle';

export interface SupplierKpiSnapshot {
  id: string;
  vendor_id: string;
  vendor_code: string | null;
  period_start: string;
  period_end: string;
  total_pos: number;
  total_grpos: number;
  on_time_grpos: number;
  late_grpos: number;
  on_time_pct: number;
  qty_variance_pct: number;
  price_variance_pct: number;
  defect_count: number;
  total_spend: number;
  match_exception_count: number;
  overall_score: number;
  calculated_at: string;
}

export function useSupplierScorecards(vendorId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const list = useQuery({
    queryKey: ['supplier-kpi-snapshots', activeCompanyId, vendorId ?? 'all'],
    queryFn: async () => {
      let q: any = supabase.from('supplier_kpi_snapshots' as any).select('*').order('period_end', { ascending: false }).limit(500);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (vendorId) q = q.eq('vendor_id', vendorId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SupplierKpiSnapshot[];
    },
  });

  const recalc = useMutation({
    mutationFn: recalcSupplierScorecard,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-kpi-snapshots'] });
      toast({ title: 'Scorecard refreshed' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...list, recalc };
}
