import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useToast } from '@/hooks/use-toast';

export interface RetirementSchedule {
  id: string;
  asset_id: string;
  planned_retirement_date: string;
  retirement_reason: string | null;
  disposal_method: string;
  estimated_salvage_value: number;
  regulatory_requirement: string | null;
  compliance_deadline: string | null;
  notification_sent: boolean;
  status: string;
  approved_by_name: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  assets?: { asset_code: string; name: string } | null;
}

export interface AssetInsurance {
  id: string;
  asset_id: string;
  policy_number: string;
  provider: string;
  coverage_type: string;
  premium_amount: number;
  coverage_amount: number;
  deductible: number;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  status: string;
  contact_person: string | null;
  contact_email: string | null;
  notes: string | null;
  created_at: string;
  assets?: { asset_code: string; name: string } | null;
}

export interface AssetImpairment {
  id: string;
  asset_id: string;
  test_date: string;
  book_value_before: number;
  fair_value: number;
  recoverable_amount: number;
  impairment_loss: number;
  book_value_after: number;
  reason: string | null;
  test_method: string;
  status: string;
  approved_by_name: string | null;
  notes: string | null;
  created_at: string;
  assets?: { asset_code: string; name: string } | null;
}

export interface ComplianceRecord {
  id: string;
  asset_id: string | null;
  record_type: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed_date: string | null;
  status: string;
  assigned_to_name: string | null;
  regulatory_body: string | null;
  reference_number: string | null;
  findings: string | null;
  corrective_actions: string | null;
  created_at: string;
  assets?: { asset_code: string; name: string } | null;
}

export function useAssetLifecycle() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['asset-retirements'] });
    qc.invalidateQueries({ queryKey: ['asset-insurance'] });
    qc.invalidateQueries({ queryKey: ['asset-impairments'] });
    qc.invalidateQueries({ queryKey: ['asset-compliance'] });
  };

  // Retirement Schedules
  const { data: retirements = [], isLoading: retirementsLoading } = useQuery({
    queryKey: ['asset-retirements', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('asset_retirement_schedules' as any).select('*, assets(asset_code, name)') as any)
        .order('planned_retirement_date', { ascending: true });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as RetirementSchedule[];
    },
  });

  // Insurance
  const { data: insurancePolicies = [], isLoading: insuranceLoading } = useQuery({
    queryKey: ['asset-insurance', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('asset_insurance' as any).select('*, assets(asset_code, name)') as any)
        .order('end_date', { ascending: true });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AssetInsurance[];
    },
  });

  // Impairments
  const { data: impairments = [] } = useQuery({
    queryKey: ['asset-impairments', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('asset_impairments' as any).select('*, assets(asset_code, name)') as any)
        .order('test_date', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AssetImpairment[];
    },
  });

  // Compliance Records
  const { data: complianceRecords = [] } = useQuery({
    queryKey: ['asset-compliance', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('asset_compliance_records' as any).select('*, assets(asset_code, name)') as any)
        .order('due_date', { ascending: true });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ComplianceRecord[];
    },
  });

  // Create Retirement Schedule
  const createRetirement = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const insertData = { ...data, created_by: user?.id || null, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) };
      const { error } = await (supabase.from('asset_retirement_schedules' as any).insert(insertData) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Retirement scheduled' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Approve Retirement
  const approveRetirement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('asset_retirement_schedules' as any).update({
        status: 'approved', approved_by_name: profile?.full_name || 'System', approved_at: new Date().toISOString(),
      }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Retirement approved' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Execute Retirement (dispose asset)
  const executeRetirement = useMutation({
    mutationFn: async ({ id, asset_id }: { id: string; asset_id: string }) => {
      const { error: retError } = await (supabase.from('asset_retirement_schedules' as any).update({ status: 'completed' }).eq('id', id) as any);
      if (retError) throw retError;
      const { error: assetError } = await supabase.from('assets').update({ status: 'retired' }).eq('id', asset_id);
      if (assetError) throw assetError;
    },
    onSuccess: () => { invalidateAll(); qc.invalidateQueries({ queryKey: ['assets'] }); toast({ title: 'Asset retired' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Create Insurance
  const createInsurance = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const insertData = { ...data, created_by: user?.id || null, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) };
      const { error } = await (supabase.from('asset_insurance' as any).insert(insertData) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Insurance policy added' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Create Impairment Test
  const createImpairment = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const recoverable = Math.max(data.fair_value || 0, data.value_in_use || 0);
      const impairmentLoss = Math.max(0, (data.book_value_before || 0) - recoverable);
      const bookValueAfter = (data.book_value_before || 0) - impairmentLoss;
      const { value_in_use, ...rest } = data;
      const insertData = {
        ...rest,
        recoverable_amount: recoverable,
        impairment_loss: impairmentLoss,
        book_value_after: bookValueAfter,
        created_by: user?.id || null,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      };
      const { error } = await (supabase.from('asset_impairments' as any).insert(insertData) as any);
      if (error) throw error;
      if (impairmentLoss > 0) {
        await supabase.from('assets').update({ current_value: bookValueAfter }).eq('id', data.asset_id);
      }
    },
    onSuccess: () => { invalidateAll(); qc.invalidateQueries({ queryKey: ['assets'] }); toast({ title: 'Impairment test recorded' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Create Compliance Record
  const createComplianceRecord = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const insertData = { ...data, created_by: user?.id || null, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) };
      const { error } = await (supabase.from('asset_compliance_records' as any).insert(insertData) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Compliance record created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Complete Compliance Record
  const completeCompliance = useMutation({
    mutationFn: async ({ id, findings, corrective_actions }: { id: string; findings?: string; corrective_actions?: string }) => {
      const { error } = await (supabase.from('asset_compliance_records' as any).update({
        status: 'completed', completed_date: new Date().toISOString().split('T')[0], findings, corrective_actions,
      }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: 'Compliance record completed' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Computed: expiring insurance (within 30 days)
  const expiringInsurance = insurancePolicies.filter(p => {
    if (p.status !== 'active') return false;
    const daysLeft = (new Date(p.end_date).getTime() - Date.now()) / 86400000;
    return daysLeft >= 0 && daysLeft <= 30;
  });

  // Computed: upcoming retirements (within 90 days)
  const upcomingRetirements = retirements.filter(r => {
    if (r.status === 'completed' || r.status === 'cancelled') return false;
    const daysLeft = (new Date(r.planned_retirement_date).getTime() - Date.now()) / 86400000;
    return daysLeft >= 0 && daysLeft <= 90;
  });

  // Computed: overdue compliance
  const overdueCompliance = complianceRecords.filter(c => {
    if (c.status === 'completed') return false;
    return c.due_date && new Date(c.due_date) < new Date();
  });

  // Summary stats
  const totalInsurancePremiums = insurancePolicies.filter(p => p.status === 'active').reduce((s, p) => s + p.premium_amount, 0);
  const totalCoverageAmount = insurancePolicies.filter(p => p.status === 'active').reduce((s, p) => s + p.coverage_amount, 0);
  const totalImpairmentLoss = impairments.reduce((s, i) => s + i.impairment_loss, 0);

  return {
    retirements, retirementsLoading,
    insurancePolicies, insuranceLoading,
    impairments,
    complianceRecords,
    expiringInsurance, upcomingRetirements, overdueCompliance,
    totalInsurancePremiums, totalCoverageAmount, totalImpairmentLoss,
    createRetirement, approveRetirement, executeRetirement,
    createInsurance,
    createImpairment,
    createComplianceRecord, completeCompliance,
  };
}
