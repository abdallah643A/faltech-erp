import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useSubcontractors() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const list = useQuery({
    queryKey: ['cpms-subcontractors', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('cpms_subcontractors' as any).select('*').order('name');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('cpms_subcontractors' as any).insert({ ...data, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cpms-subcontractors'] }); toast({ title: 'Subcontractor added' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from('cpms_subcontractors' as any).update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cpms-subcontractors'] }); toast({ title: 'Subcontractor updated' }); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('cpms_subcontractors' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cpms-subcontractors'] }); toast({ title: 'Subcontractor deleted' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const checkCompliance = (sub: any): { canPay: boolean; issues: string[] } => {
    const issues: string[] = [];
    const today = new Date().toISOString().split('T')[0];
    if (sub.insurance_expiry && sub.insurance_expiry < today) issues.push('Insurance expired on ' + sub.insurance_expiry);
    if (sub.safety_cert_expiry && sub.safety_cert_expiry < today) issues.push('Safety certification expired on ' + sub.safety_cert_expiry);
    if (sub.license_expiry && sub.license_expiry < today) issues.push('License expired on ' + sub.license_expiry);
    return { canPay: issues.length === 0, issues };
  };

  const getExpiryStatus = (dateStr: string | null): 'ok' | 'warning' | 'danger' | 'none' => {
    if (!dateStr) return 'none';
    const today = new Date();
    const expiry = new Date(dateStr);
    const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return 'danger';
    if (daysUntil < 30) return 'danger';
    if (daysUntil < 90) return 'warning';
    return 'ok';
  };

  return { list, create, update, remove, checkCompliance, getExpiryStatus };
}

export function useSubcontractOrders(projectId?: string | null, subcontractorId?: string | null) {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const orders = useQuery({
    queryKey: ['subcontract-orders', projectId, subcontractorId, activeCompanyId],
    enabled: !!(projectId || subcontractorId),
    queryFn: async () => {
      let q = supabase.from('cpms_subcontract_orders' as any).select('*').order('created_at', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId);
      if (subcontractorId) q = q.eq('subcontractor_id', subcontractorId);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createOrder = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('cpms_subcontract_orders' as any).insert({ ...data, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subcontract-orders'] }); toast({ title: 'Subcontract order created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateOrder = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from('cpms_subcontract_orders' as any).update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subcontract-orders'] }),
  });

  return { orders, createOrder, updateOrder };
}

export function useSubcontractPayments(orderId: string | null) {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const payments = useQuery({
    queryKey: ['subcontract-payments', orderId, activeCompanyId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase.from('cpms_subcontract_payments' as any).select('*').eq('subcontract_order_id', orderId!).order('application_date', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const createPayment = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('cpms_subcontract_payments' as any).insert({ ...data, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subcontract-payments'] }); toast({ title: 'Payment application created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { payments, createPayment };
}

export function useSubcontractorInvoices(subcontractorId?: string | null, orderId?: string | null) {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const invoices = useQuery({
    queryKey: ['subcontractor-invoices', subcontractorId, orderId, activeCompanyId],
    enabled: !!(subcontractorId || orderId),
    queryFn: async () => {
      let q = supabase.from('cpms_subcontractor_invoices' as any).select('*').order('invoice_date', { ascending: false });
      if (subcontractorId) q = q.eq('subcontractor_id', subcontractorId);
      if (orderId) q = q.eq('subcontract_order_id', orderId);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createInvoice = useMutation({
    mutationFn: async (data: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        ...data,
        created_by: user?.id,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      };
      const { error } = await supabase.from('cpms_subcontractor_invoices' as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subcontractor-invoices'] }); toast({ title: 'Invoice received' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateInvoice = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from('cpms_subcontractor_invoices' as any).update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subcontractor-invoices'] }); toast({ title: 'Invoice updated' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const markPaid = useMutation({
    mutationFn: async ({ id, payment_method, payment_reference }: { id: string; payment_method: string; payment_reference: string }) => {
      const { error } = await supabase.from('cpms_subcontractor_invoices' as any).update({
        paid: true,
        paid_date: new Date().toISOString().split('T')[0],
        payment_method,
        payment_reference,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subcontractor-invoices'] }); toast({ title: 'Invoice marked as paid' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { invoices, createInvoice, updateInvoice, markPaid };
}
