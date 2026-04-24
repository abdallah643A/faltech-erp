import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useVendorPerformance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['vendor-performance', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('vendor_performance' as any).select('*').order('reliability_score', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const recalculate = useMutation({
    mutationFn: async () => {
      // Fetch POs and GRPOs to calculate vendor metrics
      let poQuery = supabase.from('purchase_orders').select('*') as any;
      if (activeCompanyId) poQuery = poQuery.eq('company_id', activeCompanyId);
      const { data: pos = [] } = await poQuery;

      let grQuery = supabase.from('goods_receipts' as any).select('*') as any;
      if (activeCompanyId) grQuery = grQuery.eq('company_id', activeCompanyId);
      const { data: grpos = [] } = await grQuery;

      let apQuery = supabase.from('ap_invoices').select('*') as any;
      if (activeCompanyId) apQuery = apQuery.eq('company_id', activeCompanyId);
      const { data: apInvoices = [] } = await apQuery;

      const vendorMap: Record<string, any> = {};

      pos.forEach((po: any) => {
        const key = po.vendor_name || 'Unknown';
        if (!vendorMap[key]) vendorMap[key] = { vendor_name: key, vendor_code: po.vendor_code, total_orders: 0, total_delivered: 0, on_time_deliveries: 0, total_spend: 0, lead_times: [], promised_lead_times: [] };
        vendorMap[key].total_orders++;

        if (['fully_delivered', 'closed'].includes(po.status)) {
          vendorMap[key].total_delivered++;
          if (po.delivery_date && po.doc_date) {
            const actual = (new Date(po.delivery_date).getTime() - new Date(po.doc_date).getTime()) / 86400000;
            vendorMap[key].lead_times.push(actual);
            if (actual <= 30) vendorMap[key].on_time_deliveries++;
          }
        }
      });

      apInvoices.forEach((inv: any) => {
        const key = inv.vendor_name || 'Unknown';
        if (!vendorMap[key]) vendorMap[key] = { vendor_name: key, vendor_code: inv.vendor_code, total_orders: 0, total_delivered: 0, on_time_deliveries: 0, total_spend: 0, lead_times: [], promised_lead_times: [] };
        vendorMap[key].total_spend += inv.total || 0;
      });

      // Upsert vendor performance records
      for (const v of Object.values(vendorMap) as any[]) {
        const avgLead = v.lead_times.length > 0 ? v.lead_times.reduce((a: number, b: number) => a + b, 0) / v.lead_times.length : 0;
        const reliability = v.total_delivered > 0 ? (v.on_time_deliveries / v.total_delivered) * 100 : 0;

        // Check if exists
        const { data: existing } = await (supabase.from('vendor_performance' as any)
          .select('id').eq('vendor_name', v.vendor_name)
          .maybeSingle() as any);

        const record = {
          vendor_name: v.vendor_name,
          vendor_code: v.vendor_code,
          total_orders: v.total_orders,
          total_delivered: v.total_delivered,
          on_time_deliveries: v.on_time_deliveries,
          avg_lead_time_days: Math.round(avgLead * 100) / 100,
          reliability_score: Math.round(reliability * 100) / 100,
          total_spend: v.total_spend,
          last_calculated_at: new Date().toISOString(),
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        };

        if (existing) {
          await (supabase.from('vendor_performance' as any).update(record).eq('id', existing.id) as any);
        } else {
          await (supabase.from('vendor_performance' as any).insert(record) as any);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-performance'] });
      toast({ title: 'Vendor scores recalculated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { vendors, isLoading, recalculate };
}

export function useVendorAcknowledgments() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: acknowledgments = [], isLoading } = useQuery({
    queryKey: ['vendor-acknowledgments', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('vendor_po_acknowledgments' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const acknowledge = useMutation({
    mutationFn: async (data: { purchase_order_id: string; promised_delivery_date?: string; notes?: string }) => {
      const { error } = await (supabase.from('vendor_po_acknowledgments' as any).insert({
        ...data,
        acknowledged_at: new Date().toISOString(),
        status: 'acknowledged',
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-acknowledgments'] });
      toast({ title: 'PO acknowledged' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { acknowledgments, isLoading, acknowledge };
}
