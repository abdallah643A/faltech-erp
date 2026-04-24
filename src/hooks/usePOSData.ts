import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';

export function usePOSTransactions(filters?: { branchId?: string; dateFrom?: string; dateTo?: string; status?: string }) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['pos-transactions', activeCompanyId, filters],
    queryFn: async () => {
      let q = supabase.from('pos_transactions').select('*, pos_transaction_lines(*)').eq('company_id', activeCompanyId!).order('created_at', { ascending: false }).limit(500);
      if (filters?.status) q = q.eq('status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });
}

export function usePOSDashboardKPIs() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['pos-dashboard-kpis', activeCompanyId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data: txns, error } = await supabase.from('pos_transactions').select('id, grand_total, discount_amount, tax_amount, status, payment_method, created_at').eq('company_id', activeCompanyId!).gte('created_at', today);
      if (error) throw error;
      const all = (txns || []) as any[];
      const sales = all.filter(t => t.status === 'completed');
      const returns = all.filter(t => t.status === 'returned');
      const totalSales = sales.reduce((s, t) => s + Number(t.grand_total || 0), 0);
      const totalReturns = returns.reduce((s, t) => s + Number(t.grand_total || 0), 0);
      const totalDiscount = sales.reduce((s, t) => s + Number(t.discount_amount || 0), 0);
      const totalTax = sales.reduce((s, t) => s + Number(t.tax_amount || 0), 0);
      const avgBasket = sales.length ? totalSales / sales.length : 0;
      const cashSales = sales.filter(t => t.payment_method === 'cash').reduce((s, t) => s + Number(t.grand_total || 0), 0);
      const cardSales = sales.filter(t => t.payment_method === 'card').reduce((s, t) => s + Number(t.grand_total || 0), 0);
      const hourly: Record<number, number> = {};
      sales.forEach(t => { const h = new Date(t.created_at).getHours(); hourly[h] = (hourly[h] || 0) + Number(t.grand_total || 0); });
      const hourlyData = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, amount: hourly[i] || 0 }));
      return { totalSales, totalReturns, netSales: totalSales - totalReturns, totalDiscount, totalTax, transactionCount: sales.length, returnCount: returns.length, avgBasket, cashSales, cardSales, hourlyData };
    },
    enabled: !!activeCompanyId,
    refetchInterval: 30000,
  });
}

export function usePOSItems() {
  return useQuery({
    queryKey: ['pos-items-master'],
    queryFn: async () => {
      const { data, error } = await supabase.from('items').select('item_code, description, default_price, barcode, item_group, is_sales_item').eq('is_sales_item', true).order('description').limit(2000);
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function usePOSHoldCarts() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const query = useQuery({
    queryKey: ['pos-hold-carts', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('pos_hold_carts' as any).select('*').eq('company_id', activeCompanyId!).eq('status', 'held').order('held_at', { ascending: false }) as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });
  const holdCart = useMutation({
    mutationFn: async (cart: any) => {
      const { error } = await (supabase.from('pos_hold_carts' as any).insert({ ...cart, company_id: activeCompanyId }) as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pos-hold-carts'] }); toast({ title: 'Cart held' }); },
  });
  const resumeCart = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('pos_hold_carts' as any).update({ status: 'resumed', resumed_at: new Date().toISOString() }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pos-hold-carts'] }); },
  });
  return { ...query, holdCart, resumeCart };
}

export function usePOSReturns() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const query = useQuery({
    queryKey: ['pos-returns', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('pos_returns' as any).select('*, pos_return_lines(*)').eq('company_id', activeCompanyId!).order('created_at', { ascending: false }).limit(200) as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });
  const createReturn = useMutation({
    mutationFn: async ({ header, lines }: { header: any; lines: any[] }) => {
      const { data, error } = await (supabase.from('pos_returns' as any).insert({ ...header, company_id: activeCompanyId, return_number: '' }).select().single() as any);
      if (error) throw error;
      if (lines.length) {
        const { error: lErr } = await (supabase.from('pos_return_lines' as any).insert(lines.map(l => ({ ...l, return_id: (data as any).id }))) as any);
        if (lErr) throw lErr;
      }
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pos-returns'] }); toast({ title: 'Return created' }); },
  });
  return { ...query, createReturn };
}

export function usePOSProfiles() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['pos-profiles', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('pos_profiles' as any).select('*').eq('company_id', activeCompanyId!) as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });
}

export function usePostPOSTransaction() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ lines, payments, customerName, customerCode, notes, discountAmount }: {
      lines: Array<{ item_code: string; item_name: string; quantity: number; unit_price: number; discount_percent: number; tax_percent: number; line_total: number }>;
      payments: Array<{ method: string; amount: number; reference?: string }>;
      customerName?: string; customerCode?: string; notes?: string; discountAmount?: number;
    }) => {
      const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
      const taxAmount = lines.reduce((s, l) => s + (l.line_total * l.tax_percent / 100), 0);
      const grandTotal = subtotal + taxAmount - (discountAmount || 0);
      const primaryMethod = payments.length === 1 ? payments[0].method : 'split';
      const txnNo = `POS-${Date.now().toString(36).toUpperCase()}`;
      const { data: txn, error } = await supabase.from('pos_transactions').insert({
        company_id: activeCompanyId, transaction_no: txnNo,
        customer_name: customerName || 'Walk-in Customer', customer_code: customerCode, payment_method: primaryMethod,
        subtotal, tax_amount: taxAmount, discount_amount: discountAmount || 0, grand_total: grandTotal,
        status: 'completed', cashier_id: user?.id, cashier_name: user?.email,
      } as any).select().single();
      if (error) throw error;
      const { error: lErr } = await supabase.from('pos_transaction_lines').insert(
        lines.map((l, i) => ({ transaction_id: txn.id, line_num: i + 1, item_code: l.item_code, item_description: l.item_name, quantity: l.quantity, unit_price: l.unit_price, discount_percent: l.discount_percent, tax_percent: l.tax_percent, line_total: l.line_total }))
      );
      if (lErr) throw lErr;
      return txn;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['pos-dashboard-kpis'] });
      toast({ title: 'Sale posted successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}
