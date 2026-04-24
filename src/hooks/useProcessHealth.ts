import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface StageMetric {
  stage: string;
  module: string;
  count: number;
  avgAgeDays: number;
  overdueCount: number;
  oldestDate: string | null;
}

export interface ProcessTrend {
  date: string;
  created: number;
  completed: number;
  stuck: number;
}

export interface TopBlocker {
  label: string;
  module: string;
  count: number;
  avgDays: number;
  link: string;
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(dateStr).getTime()) / 86400000));
}

function buildStages(
  rows: { status: string; date: string }[],
  module: string,
  overdueThreshold = 7
): StageMetric[] {
  const byStatus = new Map<string, { status: string; date: string }[]>();
  for (const r of rows) {
    const s = r.status || 'unknown';
    if (!byStatus.has(s)) byStatus.set(s, []);
    byStatus.get(s)!.push(r);
  }
  const result: StageMetric[] = [];
  for (const [status, items] of byStatus) {
    const ages = items.map(i => daysSince(i.date));
    const avgAge = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
    const overdueCount = ages.filter(a => a > overdueThreshold).length;
    const oldestDate = items.reduce((oldest: string | null, i) => {
      return !oldest || i.date < oldest ? i.date : oldest;
    }, null);
    result.push({ stage: status, module, count: items.length, avgAgeDays: avgAge, overdueCount, oldestDate });
  }
  return result;
}

function getModuleLink(module: string): string {
  const map: Record<string, string> = {
    CRM: '/opportunities', Sales: '/sales-orders', Procurement: '/procurement',
    Finance: '/finance', HR: '/hr', Projects: '/pm/projects', Approvals: '/approval-inbox',
  };
  return map[module] || '/';
}

export function useProcessHealth(branchId?: string | null) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['process-health', activeCompanyId, branchId],
    queryFn: async () => {
      const cid = activeCompanyId;

      // Parallel fetches with explicit typing
      const [oppRes, soRes, poRes, apRes, arRes, leaveRes, projRes, apprRes, mrRes] = await Promise.all([
        (() => {
          let q = supabase.from('opportunities').select('id, stage, created_at');
          if (cid) q = q.eq('company_id', cid);
          return q.limit(5000);
        })(),
        (() => {
          let q = supabase.from('sales_orders').select('id, status, created_at, branch_id');
          if (cid) q = q.eq('company_id', cid);
          return q.limit(5000);
        })(),
        (() => {
          let q = supabase.from('purchase_orders').select('id, status, created_at, branch_id');
          if (cid) q = q.eq('company_id', cid);
          return q.limit(5000);
        })(),
        (() => {
          let q = supabase.from('ap_invoices').select('id, status, doc_date, branch_id');
          if (cid) q = q.eq('company_id', cid);
          return q.limit(5000);
        })(),
        (() => {
          let q = supabase.from('ar_invoices').select('id, status, doc_date, branch_id');
          if (cid) q = q.eq('company_id', cid);
          return q.limit(5000);
        })(),
        (() => {
          let q = supabase.from('leave_requests').select('id, status, created_at');
          if (cid) q = q.eq('company_id', cid);
          return q.limit(5000);
        })(),
        (() => {
          let q = supabase.from('projects').select('id, current_phase, status, created_at');
          if (cid) q = q.eq('company_id', cid);
          return q.limit(5000);
        })(),
        supabase.from('approval_requests').select('id, status, created_at').limit(5000),
        (() => {
          let q = supabase.from('material_requests').select('id, status, created_at, branch_id');
          if (cid) q = q.eq('company_id', cid);
          return q.limit(5000);
        })(),
      ]);

      const opportunities = (oppRes.data || []).map(r => ({ status: r.stage, date: r.created_at }));
      const salesOrders = (soRes.data || [])
        .filter(r => !branchId || r.branch_id === branchId)
        .map(r => ({ status: r.status, date: r.created_at }));
      const purchaseOrders = (poRes.data || [])
        .filter(r => !branchId || r.branch_id === branchId)
        .map(r => ({ status: r.status, date: r.created_at }));
      const apInvoices = (apRes.data || [])
        .filter(r => !branchId || r.branch_id === branchId)
        .map(r => ({ status: r.status, date: r.doc_date }));
      const arInvoices = (arRes.data || [])
        .filter(r => !branchId || r.branch_id === branchId)
        .map(r => ({ status: r.status || 'unknown', date: r.doc_date }));
      const leaveRequests = (leaveRes.data || []).map(r => ({ status: r.status || 'unknown', date: r.created_at }));
      const projectRows = (projRes.data || []).map(r => ({ status: r.current_phase || r.status || 'unknown', date: r.created_at }));
      const approvalRows = (apprRes.data || []).map(r => ({ status: r.status || 'unknown', date: r.created_at }));
      const materialReqs = (mrRes.data || [])
        .filter(r => !branchId || r.branch_id === branchId)
        .map(r => ({ status: r.status || 'unknown', date: r.created_at }));

      // Build stage metrics
      const stages: StageMetric[] = [
        ...buildStages(opportunities, 'CRM', 14),
        ...buildStages(salesOrders, 'Sales', 7),
        ...buildStages(purchaseOrders, 'Procurement', 7),
        ...buildStages(apInvoices, 'AP Invoices', 14),
        ...buildStages(arInvoices, 'AR Invoices', 14),
        ...buildStages(leaveRequests, 'HR', 3),
        ...buildStages(projectRows, 'Projects', 30),
        ...buildStages(approvalRows, 'Approvals', 3),
        ...buildStages(materialReqs, 'Material Requests', 5),
      ];

      const totalDocuments = opportunities.length + salesOrders.length + purchaseOrders.length +
        apInvoices.length + arInvoices.length + leaveRequests.length + materialReqs.length;

      const stuckDocs = stages.filter(s => s.avgAgeDays > 7 && s.count > 0).reduce((sum, s) => sum + s.count, 0);
      const overdueApprovals = approvalRows.filter(r => r.status === 'pending' && daysSince(r.date) > 3).length;

      // Top blockers
      const blockers: TopBlocker[] = stages
        .filter(s => s.count > 0 && s.avgAgeDays > 3)
        .sort((a, b) => (b.count * b.avgAgeDays) - (a.count * a.avgAgeDays))
        .slice(0, 10)
        .map(s => ({
          label: `${s.module} → ${s.stage}`,
          module: s.module,
          count: s.count,
          avgDays: s.avgAgeDays,
          link: getModuleLink(s.module),
        }));

      // Trends (last 4 weeks)
      const now = Date.now();
      const allDocs = [...salesOrders, ...purchaseOrders, ...arInvoices, ...apInvoices];
      const trends: ProcessTrend[] = [];
      for (let w = 3; w >= 0; w--) {
        const wStart = new Date(now - (w + 1) * 7 * 86400000);
        const wEnd = new Date(now - w * 7 * 86400000);
        const label = wStart.toLocaleDateString('en', { month: 'short', day: 'numeric' });
        const created = allDocs.filter(d => { const dt = new Date(d.date); return dt >= wStart && dt < wEnd; }).length;
        const completed = allDocs.filter(d => {
          const s = d.status?.toLowerCase();
          const dt = new Date(d.date);
          return (s === 'completed' || s === 'closed' || s === 'paid') && dt >= wStart && dt < wEnd;
        }).length;
        trends.push({ date: label, created, completed, stuck: Math.max(0, created - completed) });
      }

      // Module summary
      const moduleNames = ['CRM', 'Sales', 'Procurement', 'AP Invoices', 'AR Invoices', 'HR', 'Projects', 'Approvals', 'Material Requests'];
      const moduleSummary = moduleNames.map(m => {
        const mStages = stages.filter(s => s.module === m);
        return {
          module: m,
          total: mStages.reduce((a, s) => a + s.count, 0),
          stuck: mStages.filter(s => s.avgAgeDays > 7).reduce((a, s) => a + s.count, 0),
          avgAge: mStages.length ? Math.round(mStages.reduce((a, s) => a + s.avgAgeDays * s.count, 0) / Math.max(mStages.reduce((a, s) => a + s.count, 0), 1)) : 0,
        };
      }).filter(m => m.total > 0);

      return {
        stages,
        totalDocuments,
        stuckDocs,
        overdueApprovals,
        blockers,
        trends,
        moduleSummary,
        activeProjects: projectRows.filter(p => p.status !== 'completed').length,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
