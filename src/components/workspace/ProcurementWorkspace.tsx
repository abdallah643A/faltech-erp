import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { WorkspaceKPICard } from '@/components/workspace/WorkspaceKPICard';
import { WorkspacePendingActions, type PendingAction } from '@/components/workspace/WorkspacePendingActions';
import { WorkspaceShortcuts } from '@/components/workspace/WorkspaceShortcuts';
import { WorkspaceRecentDocs, type RecentDoc } from '@/components/workspace/WorkspaceRecentDocs';
import { Package, FileText, ShoppingCart, Truck, ClipboardList, BarChart3 } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { CopilotPanel } from '@/components/copilot/CopilotPanel';

export function ProcurementWorkspace() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const { data: kpis } = useQuery({
    queryKey: ['proc-ws-kpis', activeCompanyId],
    queryFn: async () => {
      const cid = activeCompanyId!;
      const [mrs, pos, prs, apInvs] = await Promise.all([
        supabase.from('material_requests').select('id', { count: 'exact', head: true }).in('status', ['pending', 'approved']).eq('company_id', cid),
        supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).eq('status', 'open').eq('company_id', cid),
        supabase.from('purchase_requests').select('id', { count: 'exact', head: true }).eq('status', 'open').eq('company_id', cid),
        supabase.from('ap_invoices').select('id', { count: 'exact', head: true }).eq('status', 'open').eq('company_id', cid),
      ]);
      return { materialRequests: mrs.count || 0, purchaseOrders: pos.count || 0, purchaseRequests: prs.count || 0, apInvoices: apInvs.count || 0 };
    },
    enabled: !!activeCompanyId,
  });

  const { data: pendingActions = [] } = useQuery<PendingAction[]>({
    queryKey: ['proc-ws-pending', activeCompanyId],
    queryFn: async () => {
      const actions: PendingAction[] = [];
      const { data: mrs } = await supabase.from('material_requests').select('id, mr_number, status, created_at, project_name')
        .in('status', ['pending']).eq('company_id', activeCompanyId!).order('created_at').limit(5);
      (mrs || []).forEach(m => {
        const age = differenceInDays(new Date(), new Date(m.created_at));
        actions.push({ id: m.id, title: m.mr_number || 'MR', subtitle: m.project_name || undefined, priority: age > 5 ? 'high' : 'medium', href: '/material-requests', age: `${age}d` });
      });
      const { data: pos } = await supabase.from('purchase_orders').select('id, po_number, vendor_name, status, created_at')
        .eq('status', 'open').eq('company_id', activeCompanyId!).order('created_at').limit(5);
      (pos || []).forEach(p => {
        const age = differenceInDays(new Date(), new Date(p.created_at));
        actions.push({ id: p.id, title: p.po_number || 'PO', subtitle: p.vendor_name, priority: age > 14 ? 'high' : 'medium', href: '/procurement', age: `${age}d` });
      });
      return actions;
    },
    enabled: !!activeCompanyId,
  });

  const { data: recentDocs = [] } = useQuery<RecentDoc[]>({
    queryKey: ['proc-ws-recent', activeCompanyId],
    queryFn: async () => {
      const { data } = await supabase.from('purchase_orders').select('id, po_number, vendor_name, status, created_at, total')
        .eq('company_id', activeCompanyId!).order('created_at', { ascending: false }).limit(6);
      return (data || []).map(d => ({
        id: d.id, docNum: d.po_number || 'PO', type: 'Purchase Order', partner: d.vendor_name,
        status: d.status || 'open', date: d.created_at, href: '/procurement', amount: d.total || 0,
      }));
    },
    enabled: !!activeCompanyId,
  });

  const shortcuts = [
    { label: 'Material Requests', icon: ClipboardList, href: '/material-requests', color: 'hsl(var(--primary))' },
    { label: 'Purchase Orders', icon: ShoppingCart, href: '/procurement', color: '#10b981' },
    { label: 'AP Invoices', icon: FileText, href: '/ar-invoices', color: '#f59e0b' },
    { label: 'Vendors', icon: Truck, href: '/business-partners', color: '#3b82f6' },
    { label: 'Analytics', icon: BarChart3, href: '/procurement-analytics', color: '#8b5cf6' },
    { label: 'Items', icon: Package, href: '/items', color: '#ef4444' },
  ];

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-xl font-bold">{isAr ? 'مساحة المشتريات' : 'Procurement Workspace'}</h1>
        <p className="text-sm text-muted-foreground">{isAr ? 'نظرة على المشتريات والتوريد' : 'Purchasing & supply at a glance'}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <WorkspaceKPICard title="Material Requests" value={kpis?.materialRequests ?? 0} icon={ClipboardList} color="hsl(var(--primary))" href="/material-requests" />
        <WorkspaceKPICard title="Open POs" value={kpis?.purchaseOrders ?? 0} icon={ShoppingCart} color="#10b981" href="/procurement" />
        <WorkspaceKPICard title="Purchase Requests" value={kpis?.purchaseRequests ?? 0} icon={FileText} color="#f59e0b" href="/procurement" />
        <WorkspaceKPICard title="AP Invoices" value={kpis?.apInvoices ?? 0} icon={Package} color="#3b82f6" href="/ar-invoices" />
      </div>
      <WorkspaceShortcuts shortcuts={shortcuts} />
      <CopilotPanel
        module="procurement"
        title={isAr ? 'مساعد الذكاء للمشتريات' : 'Procurement AI Copilot'}
        canRequest canApprove
        context={{
          material_requests: kpis?.materialRequests ?? 0,
          open_purchase_orders: kpis?.purchaseOrders ?? 0,
          purchase_requests: kpis?.purchaseRequests ?? 0,
          open_ap_invoices: kpis?.apInvoices ?? 0,
          pending_actions: pendingActions.slice(0, 5).map(a => ({ title: a.title, priority: a.priority, age: a.age })),
        }}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkspacePendingActions title={isAr ? 'إجراءات معلقة' : 'Pending Actions'} actions={pendingActions} />
        <WorkspaceRecentDocs docs={recentDocs} />
      </div>
    </div>
  );
}
