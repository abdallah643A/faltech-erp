import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface ChangeOrder {
  id?: string;
  project_id: string;
  co_number: string;
  title: string;
  description?: string;
  reason?: string;
  status: string;
  priority: string;
  requested_by?: string;
  requested_date?: string;
  submitted_date?: string;
  approved_by?: string;
  approved_date?: string;
  implemented_date?: string;
  amount: number;
  cost_impact: number;
  schedule_impact_days: number;
  original_budget: number;
  revised_budget: number;
  original_end_date?: string;
  revised_end_date?: string;
  affected_wbs_ids?: string[];
  affected_cost_codes?: string[];
  approval_level: string;
  current_approver?: string;
  rejection_reason?: string;
  attachments?: any[];
  notes?: string;
  invoice_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export const CO_REASONS = [
  'Client Request',
  'Design Error',
  'Site Condition',
  'Code Requirement',
  'Other',
] as const;

export const CO_STATUSES = ['draft', 'submitted', 'approved', 'rejected', 'invoiced'] as const;

export function useCPMSChangeOrders(projectId?: string) {
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchChangeOrders = async () => {
    setLoading(true);
    try {
      let q = supabase.from('cpms_change_orders' as any).select('*').order('created_at', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      setChangeOrders((data || []) as any[]);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const createChangeOrder = async (co: Partial<ChangeOrder>) => {
    const { data, error } = await supabase.from('cpms_change_orders' as any)
      .insert({
        ...co,
        co_number: '', // trigger will auto-generate
        created_by: user?.id,
        submitted_date: co.status === 'submitted' ? new Date().toISOString().split('T')[0] : null,
      } as any).select().single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return null; }
    if (data) {
      await supabase.from('cpms_change_order_baselines' as any).insert({
        change_order_id: (data as any).id,
        version: 1,
        baseline_data: data,
        created_by: user?.id,
      } as any);
    }
    toast({ title: 'Change Order created', description: (data as any)?.co_number });
    await fetchChangeOrders();
    return data;
  };

  const updateChangeOrder = async (id: string, updates: Partial<ChangeOrder>) => {
    const { error } = await supabase.from('cpms_change_orders' as any).update(updates as any).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Change Order updated' });
    await fetchChangeOrders();
    return true;
  };

  const approveChangeOrder = async (id: string, approvedBy: string) => {
    const co = changeOrders.find(c => c.id === id);
    const ok = await updateChangeOrder(id, {
      status: 'approved',
      approved_by: approvedBy,
      approved_date: new Date().toISOString().split('T')[0],
    });
    // Update project financials on approval
    if (ok && co?.project_id) {
      try {
        const { data: proj } = await supabase.from('cpms_projects').select('contract_value, revised_contract_value, end_date').eq('id', co.project_id).single();
        if (proj) {
          const currentContract = (proj as any).revised_contract_value || (proj as any).contract_value || 0;
          const updates: any = {
            revised_contract_value: currentContract + (co.amount || 0),
          };
          if (co.schedule_impact_days && (proj as any).end_date) {
            const endDate = new Date((proj as any).end_date);
            endDate.setDate(endDate.getDate() + co.schedule_impact_days);
            updates.end_date = endDate.toISOString().split('T')[0];
          }
          await supabase.from('cpms_projects').update(updates).eq('id', co.project_id);
        }
      } catch { /* silent */ }
    }
    return ok;
  };

  const rejectChangeOrder = async (id: string, reason: string) => {
    return updateChangeOrder(id, { status: 'rejected', rejection_reason: reason });
  };

  const markInvoiced = async (id: string, invoiceId?: string) => {
    return updateChangeOrder(id, { status: 'invoiced', invoice_id: invoiceId } as any);
  };

  const deleteChangeOrder = async (id: string) => {
    const { error } = await supabase.from('cpms_change_orders' as any).delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Change Order deleted' });
    await fetchChangeOrders();
    return true;
  };

  const getStats = () => {
    const approved = changeOrders.filter(co => co.status === 'approved' || co.status === 'invoiced');
    const pending = changeOrders.filter(co => ['submitted', 'under_review'].includes(co.status));
    const totalCOValue = approved.reduce((s, co) => s + (co.amount || 0), 0);
    const totalCostImpact = approved.reduce((s, co) => s + (co.cost_impact || 0), 0);
    const pendingValue = pending.reduce((s, co) => s + (co.amount || 0), 0);
    const totalScheduleImpact = approved.reduce((s, co) => s + (co.schedule_impact_days || 0), 0);
    return {
      total: changeOrders.length,
      approved: approved.length,
      pending: pending.length,
      rejected: changeOrders.filter(co => co.status === 'rejected').length,
      draft: changeOrders.filter(co => co.status === 'draft').length,
      invoiced: changeOrders.filter(co => co.status === 'invoiced').length,
      totalCOValue,
      totalCostImpact,
      pendingValue,
      totalScheduleImpact,
    };
  };

  useEffect(() => { fetchChangeOrders(); }, [projectId]);

  return {
    changeOrders, loading, fetchChangeOrders,
    createChangeOrder, updateChangeOrder, approveChangeOrder, rejectChangeOrder, markInvoiced, deleteChangeOrder,
    getStats,
  };
}
