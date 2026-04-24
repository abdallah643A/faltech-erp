import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useMemo } from 'react';

export function useProcurementIntelligence() {
  const { activeCompanyId } = useActiveCompany();

  const purchaseOrders = useQuery({
    queryKey: ['proc-intel-pos', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('purchase_orders').select('*').order('created_at', { ascending: false }).limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const purchaseRequests = useQuery({
    queryKey: ['proc-intel-prs', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('purchase_requests').select('*').order('created_at', { ascending: false }).limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const goodsReceipts = useQuery({
    queryKey: ['proc-intel-grpos', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('goods_receipts').select('*').order('created_at', { ascending: false }).limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const apInvoices = useQuery({
    queryKey: ['proc-intel-ap', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ap_invoices').select('*').order('created_at', { ascending: false }).limit(1000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const projects = useQuery({
    queryKey: ['proc-intel-projects', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('projects').select('id, name, code, status, budget, actual_cost, start_date, end_date, contract_value').order('name');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const boqItems = useQuery({
    queryKey: ['proc-intel-boq'],
    queryFn: async () => {
      const { data, error } = await supabase.from('boq_items').select('*').limit(500);
      if (error) return [];
      return data as any[];
    },
  });

  return { purchaseOrders, purchaseRequests, goodsReceipts, apInvoices, projects, boqItems };
}

// Budget utilization & forecasting analytics
export function useBudgetAnalytics(pos: any[], invoices: any[], projects: any[]) {
  return useMemo(() => {
    // Per-project budget tracking
    const projectBudgets = projects.map((proj: any) => {
      const projPOs = pos.filter((po: any) => po.project_id === proj.id && po.status !== 'cancelled');
      const projInvoices = invoices.filter((inv: any) => inv.project_id === proj.id && inv.status !== 'cancelled');
      const budget = proj.budget || proj.contract_value || 0;
      const committed = projPOs.reduce((s: number, po: any) => s + (po.total || 0), 0);
      const invoiced = projInvoices.reduce((s: number, inv: any) => s + (inv.total || 0), 0);
      const remaining = budget - committed;
      const utilization = budget > 0 ? (committed / budget) * 100 : 0;
      const alertLevel = utilization > 100 ? 'critical' : utilization > 85 ? 'warning' : utilization > 70 ? 'caution' : 'normal';
      return { ...proj, committed, invoiced, remaining, utilization, alertLevel, budget };
    }).filter(p => p.budget > 0);

    // Monthly spend trend (last 12 months)
    const now = new Date();
    const monthlySpend = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const month = d.toISOString().slice(0, 7);
      const monthPOs = pos.filter((po: any) => po.doc_date?.startsWith(month) && po.status !== 'cancelled');
      const monthInv = invoices.filter((inv: any) => inv.doc_date?.startsWith(month) && inv.status !== 'cancelled');
      return {
        month: d.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
        poValue: monthPOs.reduce((s: number, po: any) => s + (po.total || 0), 0),
        invoiceValue: monthInv.reduce((s: number, inv: any) => s + (inv.total || 0), 0),
        count: monthPOs.length,
      };
    });

    // Cost forecast (simple linear projection)
    const recentMonths = monthlySpend.slice(-6);
    const avgMonthlySpend = recentMonths.reduce((s, m) => s + m.poValue, 0) / Math.max(recentMonths.length, 1);
    const forecast3m = avgMonthlySpend * 3;
    const forecast6m = avgMonthlySpend * 6;

    // Variance analysis
    const totalBudget = projectBudgets.reduce((s, p) => s + p.budget, 0);
    const totalCommitted = projectBudgets.reduce((s, p) => s + p.committed, 0);
    const totalInvoiced = projectBudgets.reduce((s, p) => s + p.invoiced, 0);
    const overallVariance = totalBudget - totalCommitted;
    const overallUtilization = totalBudget > 0 ? (totalCommitted / totalBudget) * 100 : 0;

    return {
      projectBudgets,
      monthlySpend,
      avgMonthlySpend,
      forecast3m,
      forecast6m,
      totalBudget,
      totalCommitted,
      totalInvoiced,
      overallVariance,
      overallUtilization,
    };
  }, [pos, invoices, projects]);
}

// Delivery calendar analytics
export function useDeliveryCalendar(pos: any[], grpos: any[], projects: any[]) {
  return useMemo(() => {
    const events: any[] = [];
    const delays: any[] = [];

    pos.forEach((po: any) => {
      if (po.delivery_date) {
        const isLate = po.status !== 'fully_delivered' && po.status !== 'cancelled' && new Date(po.delivery_date) < new Date();
        events.push({
          id: po.id,
          type: 'delivery',
          title: `${po.po_number} - ${po.vendor_name}`,
          date: po.delivery_date,
          status: po.status,
          total: po.total,
          projectId: po.project_id,
          projectName: projects.find((p: any) => p.id === po.project_id)?.name || null,
          isLate,
        });
        if (isLate) {
          const daysLate = Math.ceil((Date.now() - new Date(po.delivery_date).getTime()) / 86400000);
          delays.push({ ...po, daysLate, projectName: projects.find((p: any) => p.id === po.project_id)?.name });
        }
      }
    });

    // Group events by month
    const byMonth: Record<string, any[]> = {};
    events.forEach(e => {
      const m = e.date.slice(0, 7);
      if (!byMonth[m]) byMonth[m] = [];
      byMonth[m].push(e);
    });

    return { events, delays: delays.sort((a, b) => b.daysLate - a.daysLate), byMonth };
  }, [pos, grpos, projects]);
}

// Three-way matching
export function useThreeWayMatching(pos: any[], grpos: any[], invoices: any[]) {
  return useMemo(() => {
    const matches: any[] = [];

    pos.forEach((po: any) => {
      const matchedGRPOs = grpos.filter((gr: any) => gr.purchase_order_id === po.id);
      const matchedInvoices = invoices.filter((inv: any) => inv.purchase_order_id === po.id);

      const grpoTotal = matchedGRPOs.reduce((s: number, gr: any) => s + (gr.total || 0), 0);
      const invoiceTotal = matchedInvoices.reduce((s: number, inv: any) => s + (inv.total || 0), 0);
      const poTotal = po.total || 0;

      const qtyMatch = matchedGRPOs.length > 0;
      const priceMatch = Math.abs(poTotal - invoiceTotal) < poTotal * 0.02; // 2% tolerance
      const receiptMatch = Math.abs(poTotal - grpoTotal) < poTotal * 0.02;

      let status: 'matched' | 'partial' | 'discrepancy' | 'unmatched' = 'unmatched';
      const discrepancies: string[] = [];

      if (matchedGRPOs.length === 0 && matchedInvoices.length === 0) {
        status = 'unmatched';
      } else if (qtyMatch && priceMatch && receiptMatch) {
        status = 'matched';
      } else {
        if (!qtyMatch) discrepancies.push('No goods receipt');
        if (!priceMatch) discrepancies.push(`Invoice variance: ${((invoiceTotal - poTotal) / poTotal * 100).toFixed(1)}%`);
        if (!receiptMatch) discrepancies.push(`Receipt variance: ${((grpoTotal - poTotal) / poTotal * 100).toFixed(1)}%`);
        status = discrepancies.length > 1 ? 'discrepancy' : 'partial';
      }

      matches.push({
        po,
        grpos: matchedGRPOs,
        invoices: matchedInvoices,
        poTotal,
        grpoTotal,
        invoiceTotal,
        status,
        discrepancies,
      });
    });

    const matched = matches.filter(m => m.status === 'matched').length;
    const partial = matches.filter(m => m.status === 'partial').length;
    const discrepancy = matches.filter(m => m.status === 'discrepancy').length;
    const unmatched = matches.filter(m => m.status === 'unmatched').length;

    return { matches, matched, partial, discrepancy, unmatched };
  }, [pos, grpos, invoices]);
}

// Procurement cycle analytics
export function useProcurementCycleAnalytics(prs: any[], pos: any[], grpos: any[], invoices: any[]) {
  return useMemo(() => {
    // Cycle time: PR created → PO created
    const prToPOTimes: number[] = [];
    pos.forEach((po: any) => {
      if (po.purchase_request_id) {
        const pr = prs.find((p: any) => p.id === po.purchase_request_id);
        if (pr) {
          const days = (new Date(po.created_at).getTime() - new Date(pr.created_at).getTime()) / 86400000;
          if (days > 0 && days < 365) prToPOTimes.push(days);
        }
      }
    });
    const avgPRtoPO = prToPOTimes.length > 0 ? prToPOTimes.reduce((s, d) => s + d, 0) / prToPOTimes.length : 0;

    // PO → GRPO cycle time
    const poToGRPOTimes: number[] = [];
    grpos.forEach((gr: any) => {
      if (gr.purchase_order_id) {
        const po = pos.find((p: any) => p.id === gr.purchase_order_id);
        if (po) {
          const days = (new Date(gr.created_at).getTime() - new Date(po.created_at).getTime()) / 86400000;
          if (days > 0 && days < 365) poToGRPOTimes.push(days);
        }
      }
    });
    const avgPOtoGRPO = poToGRPOTimes.length > 0 ? poToGRPOTimes.reduce((s, d) => s + d, 0) / poToGRPOTimes.length : 0;

    // Supplier concentration risk
    const vendorSpend: Record<string, number> = {};
    pos.forEach((po: any) => {
      if (po.vendor_name && po.status !== 'cancelled') {
        vendorSpend[po.vendor_name] = (vendorSpend[po.vendor_name] || 0) + (po.total || 0);
      }
    });
    const totalSpend = Object.values(vendorSpend).reduce((s, v) => s + v, 0);
    const vendorConcentration = Object.entries(vendorSpend)
      .map(([vendor, spend]) => ({
        vendor,
        spend,
        share: totalSpend > 0 ? (spend / totalSpend) * 100 : 0,
        risk: totalSpend > 0 && (spend / totalSpend) > 0.3 ? 'high' : totalSpend > 0 && (spend / totalSpend) > 0.15 ? 'medium' : 'low',
      }))
      .sort((a, b) => b.spend - a.spend);

    // Category spend analysis
    const categorySpend: Record<string, number> = {};
    pos.forEach((po: any) => {
      const cat = po.remarks?.match(/category[:\s]*(\w+)/i)?.[1] || 'General';
      categorySpend[cat] = (categorySpend[cat] || 0) + (po.total || 0);
    });
    const categories = Object.entries(categorySpend).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // Cost savings: difference between quotation total and final PO total (simplified)
    const savingsEstimate = pos.reduce((s: number, po: any) => {
      if (po.purchase_quotation_id) return s + (po.total || 0) * 0.05; // est 5% negotiation savings
      return s;
    }, 0);

    return {
      avgPRtoPO: Math.round(avgPRtoPO * 10) / 10,
      avgPOtoGRPO: Math.round(avgPOtoGRPO * 10) / 10,
      avgFullCycle: Math.round((avgPRtoPO + avgPOtoGRPO) * 10) / 10,
      vendorConcentration,
      categories,
      totalSpend,
      savingsEstimate,
    };
  }, [prs, pos, grpos, invoices]);
}
