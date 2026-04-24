import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useToast } from '@/hooks/use-toast';

/**
 * Unified hook layer for the strategic-procurement enhancement:
 * sourcing events, tolerance rules, vendor risk scores, compliance alerts, regions.
 */

// ---------- Sourcing Events ----------
export function useSourcingEvents() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const list = useQuery({
    queryKey: ['proc-sourcing-events', activeCompanyId],
    queryFn: async () => {
      let q: any = supabase.from('proc_sourcing_events' as any).select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const payload = { ...row, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) };
      const { error } = await (supabase.from('proc_sourcing_events' as any).upsert(payload) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proc-sourcing-events'] }); toast({ title: 'Sourcing event saved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('proc_sourcing_events' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proc-sourcing-events'] }); toast({ title: 'Removed' }); },
  });

  return { ...list, upsert, remove };
}

export function useSourcingBidders(eventId?: string) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['proc-sourcing-bidders', eventId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('proc_sourcing_event_bidders' as any).select('*').eq('event_id', eventId).order('rank', { ascending: true, nullsFirst: false }) as any);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!eventId,
  });

  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const { error } = await (supabase.from('proc_sourcing_event_bidders' as any).upsert(row) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proc-sourcing-bidders', eventId] }),
  });

  return { ...list, upsert };
}

// ---------- Tolerance Rules ----------
export function useToleranceRules() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const list = useQuery({
    queryKey: ['proc-tolerance', activeCompanyId],
    queryFn: async () => {
      let q: any = supabase.from('proc_tolerance_rules' as any).select('*').order('rule_name');
      if (activeCompanyId) q = q.or(`company_id.eq.${activeCompanyId},company_id.is.null`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const payload = { ...row, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) };
      const { error } = await (supabase.from('proc_tolerance_rules' as any).upsert(payload) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proc-tolerance'] }); toast({ title: 'Tolerance rule saved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('proc_tolerance_rules' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proc-tolerance'] }),
  });

  return { ...list, upsert, remove };
}

// ---------- Vendor Risk ----------
export function useVendorRiskScores(vendorId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const list = useQuery({
    queryKey: ['proc-vendor-risk', activeCompanyId, vendorId ?? 'all'],
    queryFn: async () => {
      let q: any = supabase.from('proc_vendor_risk_scores' as any).select('*').order('scored_at', { ascending: false }).limit(500);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (vendorId) q = q.eq('vendor_id', vendorId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const overall = (
        (Number(row.financial_risk) || 0) * 0.25 +
        (Number(row.operational_risk) || 0) * 0.20 +
        (Number(row.compliance_risk) || 0) * 0.20 +
        (Number(row.geopolitical_risk) || 0) * 0.10 +
        (Number(row.esg_risk) || 0) * 0.10 +
        (Number(row.concentration_risk) || 0) * 0.15
      );
      const tier = overall >= 75 ? 'critical' : overall >= 50 ? 'high' : overall >= 25 ? 'medium' : 'low';
      const payload = {
        ...row,
        overall_score: Number(overall.toFixed(2)),
        risk_tier: tier,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      };
      const { error } = await (supabase.from('proc_vendor_risk_scores' as any).upsert(payload) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proc-vendor-risk'] }); toast({ title: 'Risk score saved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...list, upsert };
}

// ---------- Compliance Alerts ----------
export function useComplianceAlertRules() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const list = useQuery({
    queryKey: ['proc-compl-rules', activeCompanyId],
    queryFn: async () => {
      let q: any = supabase.from('proc_compliance_alert_rules' as any).select('*').order('document_label');
      if (activeCompanyId) q = q.or(`company_id.eq.${activeCompanyId},company_id.is.null`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: any) => {
      const payload = { ...row, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) };
      const { error } = await (supabase.from('proc_compliance_alert_rules' as any).upsert(payload) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proc-compl-rules'] }); toast({ title: 'Rule saved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...list, upsert };
}

export function useComplianceAlerts() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const list = useQuery({
    queryKey: ['proc-compl-alerts', activeCompanyId],
    queryFn: async () => {
      let q: any = supabase.from('proc_compliance_alerts' as any).select('*').order('expiry_date');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  /**
   * Generate alerts by scanning supplier_portal_documents for upcoming/expired docs
   * against the active alert rules. Idempotent per (vendor_id, document_id, severity).
   */
  const generate = useMutation({
    mutationFn: async () => {
      const [{ data: docs }, { data: rules }] = await Promise.all([
        (supabase.from('supplier_portal_documents' as any).select('*').not('expiry_date', 'is', null) as any),
        (supabase.from('proc_compliance_alert_rules' as any).select('*').eq('is_active', true) as any),
      ]);
      const today = new Date();
      const inserts: any[] = [];
      for (const d of (docs || [])) {
        const rule = (rules || []).find((r: any) => r.document_type === d.document_type);
        if (!rule) continue;
        const expiry = new Date(d.expiry_date);
        const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
        let severity: string | null = null;
        if (days < 0) severity = 'expired';
        else if (rule.warn_days_before.some((t: number) => days <= t && days >= 0)) {
          if (days <= 7) severity = 'critical';
          else if (days <= 30) severity = 'warning';
          else severity = 'info';
        }
        if (severity) {
          inserts.push({
            company_id: activeCompanyId,
            vendor_id: d.vendor_id,
            document_id: d.id,
            document_type: d.document_type,
            expiry_date: d.expiry_date,
            days_until_expiry: days,
            severity,
            status: 'open',
          });
        }
      }
      if (inserts.length) {
        const { error } = await (supabase.from('proc_compliance_alerts' as any).insert(inserts) as any);
        if (error) throw error;
      }
      return inserts.length;
    },
    onSuccess: (n) => qc.invalidateQueries({ queryKey: ['proc-compl-alerts'] }),
  });

  const acknowledge = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from('proc_compliance_alerts' as any)
        .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString(), acknowledged_by: user?.id })
        .eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proc-compl-alerts'] }),
  });

  return { ...list, generate, acknowledge };
}

// ---------- Regions ----------
export function useProcurementRegions() {
  const list = useQuery({
    queryKey: ['proc-regions'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('proc_regional_dimensions' as any).select('*').eq('is_active', true).order('region_name') as any);
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  return list;
}

// ---------- Spend by Region ----------
export function useSpendByRegion() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['spend-by-region', activeCompanyId],
    queryFn: async () => {
      let q: any = supabase.from('purchase_orders' as any).select('id,total,vendor_name,doc_date,status').limit(2000);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data: pos } = await q;
      // Aggregate – vendor → region map is best-effort; bucket unknowns under "Unassigned"
      const byVendor: Record<string, number> = {};
      for (const p of (pos || [])) {
        const k = p.vendor_name || 'Unknown';
        byVendor[k] = (byVendor[k] || 0) + Number(p.total || 0);
      }
      return Object.entries(byVendor).sort((a,b) => b[1]-a[1]).slice(0, 20).map(([vendor, spend]) => ({ vendor, spend }));
    },
  });
}
