import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface UnifiedApprovalItem {
  id: string;
  module: 'sales_order' | 'purchase_order' | 'leave_request' | 'material_request' | 'finance_gate' | 'approval_request';
  documentNumber: string;
  title: string;
  requesterName: string;
  amount: number | null;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  dueDate: string | null;
  branchId: string | null;
  department: string | null;
  sourceRoute: string;
  sourceId: string;
}

function inferPriority(amount: number | null): 'low' | 'medium' | 'high' | 'critical' {
  if (!amount) return 'medium';
  if (amount > 500000) return 'critical';
  if (amount > 100000) return 'high';
  if (amount > 10000) return 'medium';
  return 'low';
}

export function useApprovalInbox() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['approval-inbox', activeCompanyId],
    queryFn: async () => {
      const items: UnifiedApprovalItem[] = [];

      // 1. Sales Orders pending finance
      const soQuery = supabase.from('sales_orders').select('id, doc_num, customer_name, total, contract_value, created_at, branch_id, workflow_status, created_by')
        .in('workflow_status', ['pending_finance', 'cost_variance_pending']);
      if (activeCompanyId) (soQuery as any).eq('company_id', activeCompanyId);
      const { data: soData } = await soQuery;
      (soData || []).forEach((so: any) => {
        items.push({
          id: `so-${so.id}`, module: 'sales_order',
          documentNumber: `SO-${so.doc_num}`, title: `Sales Order - ${so.customer_name}`,
          requesterName: so.customer_name || '', amount: so.contract_value || so.total,
          status: so.workflow_status, priority: inferPriority(so.contract_value || so.total),
          createdAt: so.created_at, dueDate: null, branchId: so.branch_id,
          department: 'Sales', sourceRoute: '/sales-orders', sourceId: so.id,
        });
      });

      // 2. Purchase Orders pending approval
      const poQuery = supabase.from('purchase_orders').select('id, po_number, vendor_name, total, created_at, branch_id, approval_status, created_by')
        .eq('approval_status', 'pending');
      if (activeCompanyId) (poQuery as any).eq('company_id', activeCompanyId);
      const { data: poData } = await poQuery;
      (poData || []).forEach((po: any) => {
        items.push({
          id: `po-${po.id}`, module: 'purchase_order',
          documentNumber: po.po_number || `PO-${po.id.slice(0,8)}`, title: `Purchase Order - ${po.vendor_name}`,
          requesterName: po.vendor_name || '', amount: po.total,
          status: 'pending', priority: inferPriority(po.total),
          createdAt: po.created_at, dueDate: null, branchId: po.branch_id,
          department: 'Procurement', sourceRoute: '/procurement/purchase-orders', sourceId: po.id,
        });
      });

      // 3. Leave Requests pending
      const lrQuery = supabase.from('leave_requests').select('id, employee_id, start_date, end_date, total_days, status, created_at, approval_stage, reason')
        .in('status', ['pending', 'pending_direct_manager', 'pending_dept_manager', 'pending_hr']);
      if (activeCompanyId) (lrQuery as any).eq('company_id', activeCompanyId);
      const { data: lrData } = await lrQuery;
      (lrData || []).forEach((lr: any) => {
        items.push({
          id: `lr-${lr.id}`, module: 'leave_request',
          documentNumber: `LR-${lr.id.slice(0,8)}`, title: `Leave Request (${lr.total_days || 0} days)`,
          requesterName: lr.reason || 'Employee', amount: null,
          status: lr.status, priority: 'medium',
          createdAt: lr.created_at, dueDate: lr.start_date, branchId: null,
          department: 'HR', sourceRoute: '/hr/leave', sourceId: lr.id,
        });
      });

      // 4. Material Requests pending
      const mrQuery = supabase.from('material_requests').select('id, mr_number, requested_by_name, department, status, requested_at, due_out_date, branch_id')
        .in('status', ['pending', 'submitted', 'under_review']);
      if (activeCompanyId) (mrQuery as any).eq('company_id', activeCompanyId);
      const { data: mrData } = await mrQuery;
      (mrData || []).forEach((mr: any) => {
        items.push({
          id: `mr-${mr.id}`, module: 'material_request',
          documentNumber: mr.mr_number || `MR-${mr.id.slice(0,8)}`, title: `Material Request - ${mr.department || 'General'}`,
          requesterName: mr.requested_by_name || '', amount: null,
          status: mr.status, priority: 'high',
          createdAt: mr.requested_at || '', dueDate: mr.due_out_date, branchId: mr.branch_id,
          department: mr.department || 'Operations', sourceRoute: '/material-requests', sourceId: mr.id,
        });
      });

      // 5. Financial Clearances pending
      const fcQuery = supabase.from('financial_clearances').select('id, sales_order_id, clearance_type, status, total_contract_value, outstanding_amount, created_at')
        .eq('status', 'pending');
      if (activeCompanyId) (fcQuery as any).eq('company_id', activeCompanyId);
      const { data: fcData } = await fcQuery;
      (fcData || []).forEach((fc: any) => {
        items.push({
          id: `fc-${fc.id}`, module: 'finance_gate',
          documentNumber: `FC-${fc.id.slice(0,8)}`, title: `Finance Gate - ${fc.clearance_type}`,
          requesterName: '', amount: fc.total_contract_value,
          status: 'pending', priority: inferPriority(fc.total_contract_value),
          createdAt: fc.created_at, dueDate: null, branchId: null,
          department: 'Finance', sourceRoute: '/finance-gates', sourceId: fc.id,
        });
      });

      // 6. Approval Requests (generic workflow)
      const arQuery = supabase.from('approval_requests').select('*').eq('status', 'pending');
      const { data: arData } = await arQuery;
      (arData || []).forEach((ar: any) => {
        items.push({
          id: `ar-${ar.id}`, module: 'approval_request',
          documentNumber: ar.document_number || `AR-${ar.id.slice(0,8)}`, title: `Approval - ${ar.document_type}`,
          requesterName: ar.requester_name || '', amount: ar.amount,
          status: 'pending', priority: inferPriority(ar.amount),
          createdAt: ar.created_at, dueDate: null, branchId: null,
          department: 'Workflow', sourceRoute: '/approval-workflows', sourceId: ar.id,
        });
      });

      // Sort by date desc
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return items;
    },
  });
}
