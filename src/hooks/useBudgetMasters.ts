import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface BudgetMaster {
  id: string;
  budget_code: string;
  budget_name: string;
  budget_type: string;
  fiscal_year: number;
  start_date: string;
  end_date: string;
  is_multi_year: boolean;
  start_year: number | null;
  end_year: number | null;
  budget_basis: string;
  currency: string;
  exchange_rate: number;
  company_id: string | null;
  branch_id: string | null;
  department_id: string | null;
  project_id: string | null;
  cost_center_code: string | null;
  budget_owner_id: string | null;
  budget_owner_name: string | null;
  budget_controller_id: string | null;
  budget_controller_name: string | null;
  current_version: number;
  approval_status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetVersion {
  id: string;
  budget_id: string;
  version_number: number;
  status: string;
  revision_reason: string | null;
  parent_version_id: string | null;
  total_original: number;
  total_revised: number;
  total_committed: number;
  total_actual: number;
  total_forecast: number;
  total_available: number;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  activated_by: string | null;
  activated_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetVersionLine {
  id: string;
  version_id: string;
  line_num: number;
  budget_category: string | null;
  account_code: string | null;
  account_name: string | null;
  cost_element: string | null;
  cost_center_code: string | null;
  department: string | null;
  branch: string | null;
  project_code: string | null;
  phase: string | null;
  work_package: string | null;
  activity: string | null;
  vendor_name: string | null;
  item_description: string | null;
  description: string | null;
  uom: string | null;
  quantity: number;
  unit_rate: number;
  original_amount: number;
  revised_amount: number;
  committed_amount: number;
  actual_amount: number;
  forecast_amount: number;
  available_amount: number;
  variance_amount: number;
  variance_percent: number;
  start_date: string | null;
  end_date: string | null;
  allocation_method: string;
  line_status: string;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetPeriodAlloc {
  id: string;
  line_id: string;
  period_year: number;
  period_month: number;
  budget_amount: number;
  committed_amount: number;
  actual_amount: number;
  available_amount: number;
}

export interface BudgetApprovalEntry {
  id: string;
  version_id: string;
  action: string;
  acted_by: string | null;
  acted_by_name: string | null;
  role: string | null;
  comments: string | null;
  acted_at: string;
}

export interface BudgetControlRule {
  id: string;
  company_id: string | null;
  rule_name: string;
  control_level: string;
  check_against: string;
  control_timing: string[];
  tolerance_percent: number;
  tolerance_amount: number;
  override_allowed: boolean;
  control_by: string[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useBudgetMasters(filters?: { budget_type?: string; fiscal_year?: number; status?: string }) {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['budget-masters', activeCompanyId, filters],
    queryFn: async () => {
      let q = supabase.from('budget_masters' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (filters?.budget_type) q = q.eq('budget_type', filters.budget_type);
      if (filters?.fiscal_year) q = q.eq('fiscal_year', filters.fiscal_year);
      if (filters?.status) q = q.eq('approval_status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as BudgetMaster[];
    },
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async (master: Partial<BudgetMaster>) => {
      const payload = { ...master, company_id: master.company_id || activeCompanyId, created_by: user?.id };
      const { data, error } = await (supabase.from('budget_masters' as any).insert(payload).select().single() as any);
      if (error) throw error;
      // Auto-create version 1
      await (supabase.from('budget_versions' as any).insert({
        budget_id: data.id, version_number: 1, status: 'draft', created_by: user?.id
      }) as any);
      return data as BudgetMaster;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-masters'] }); toast({ title: 'Budget created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BudgetMaster> & { id: string }) => {
      const { data, error } = await (supabase.from('budget_masters' as any).update(updates).eq('id', id).select().single() as any);
      if (error) throw error;
      return data as BudgetMaster;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-masters'] }); toast({ title: 'Budget updated' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('budget_masters' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-masters'] }); toast({ title: 'Budget deleted' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, create, update, remove };
}

export function useBudgetVersions(budgetId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['budget-versions', budgetId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('budget_versions' as any).select('*').eq('budget_id', budgetId).order('version_number') as any);
      if (error) throw error;
      return (data || []) as BudgetVersion[];
    },
    enabled: !!budgetId,
  });

  const createRevision = useMutation({
    mutationFn: async ({ budgetId, reason }: { budgetId: string; reason: string }) => {
      // Get current versions
      const { data: versions } = await (supabase.from('budget_versions' as any).select('*').eq('budget_id', budgetId).order('version_number', { ascending: false }).limit(1) as any);
      const currentVersion = versions?.[0];
      const newVersionNum = (currentVersion?.version_number || 0) + 1;

      // Create new version
      const { data: newVersion, error } = await (supabase.from('budget_versions' as any).insert({
        budget_id: budgetId,
        version_number: newVersionNum,
        status: 'draft',
        revision_reason: reason,
        parent_version_id: currentVersion?.id,
        created_by: user?.id,
      }).select().single() as any);
      if (error) throw error;

      // Copy lines from current version
      if (currentVersion) {
        const { data: lines } = await (supabase.from('budget_version_lines' as any).select('*').eq('version_id', currentVersion.id) as any);
        if (lines?.length) {
          const newLines = lines.map((l: any) => ({
            ...l, id: undefined, version_id: newVersion.id, created_at: undefined, updated_at: undefined,
          }));
          await (supabase.from('budget_version_lines' as any).insert(newLines) as any);
        }
      }

      // Update master
      await (supabase.from('budget_masters' as any).update({ current_version: newVersionNum }).eq('id', budgetId) as any);

      return newVersion as BudgetVersion;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-versions'] });
      qc.invalidateQueries({ queryKey: ['budget-masters'] });
      toast({ title: 'Revision created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ versionId, status, comments }: { versionId: string; status: string; comments?: string }) => {
      const updates: any = { status };
      if (status === 'submitted') { updates.submitted_by = user?.id; updates.submitted_at = new Date().toISOString(); }
      if (status === 'approved') { updates.approved_by = user?.id; updates.approved_at = new Date().toISOString(); }
      if (status === 'active') { updates.activated_by = user?.id; updates.activated_at = new Date().toISOString(); }

      const { error } = await (supabase.from('budget_versions' as any).update(updates).eq('id', versionId) as any);
      if (error) throw error;

      // Log approval history
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', user?.id || '').single();
      await (supabase.from('budget_approval_history' as any).insert({
        version_id: versionId,
        action: status,
        acted_by: user?.id,
        acted_by_name: profile?.full_name || 'Unknown',
        comments,
      }) as any);

      // If activating, supersede other active versions of same budget
      if (status === 'active') {
        const { data: version } = await (supabase.from('budget_versions' as any).select('budget_id').eq('id', versionId).single() as any);
        if (version) {
          await (supabase.from('budget_versions' as any).update({ status: 'superseded' }).eq('budget_id', version.budget_id).neq('id', versionId).eq('status', 'active') as any);
          await (supabase.from('budget_masters' as any).update({ approval_status: 'active' }).eq('id', version.budget_id) as any);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-versions'] });
      qc.invalidateQueries({ queryKey: ['budget-masters'] });
      qc.invalidateQueries({ queryKey: ['budget-approval-history'] });
      toast({ title: 'Status updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, createRevision, updateStatus };
}

export function useBudgetVersionLines(versionId?: string) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['budget-version-lines', versionId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('budget_version_lines' as any).select('*').eq('version_id', versionId).order('line_num') as any);
      if (error) throw error;
      return (data || []) as BudgetVersionLine[];
    },
    enabled: !!versionId,
  });

  const upsert = useMutation({
    mutationFn: async (line: Partial<BudgetVersionLine>) => {
      if (line.id) {
        const { id, ...updates } = line;
        const { data, error } = await (supabase.from('budget_version_lines' as any).update(updates).eq('id', id).select().single() as any);
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await (supabase.from('budget_version_lines' as any).insert(line).select().single() as any);
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-version-lines'] }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('budget_version_lines' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-version-lines'] }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, upsert, remove };
}

export function useBudgetPeriodAllocs(lineId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['budget-period-allocs', lineId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('budget_period_allocs' as any).select('*').eq('line_id', lineId).order('period_year').order('period_month') as any);
      if (error) throw error;
      return (data || []) as BudgetPeriodAlloc[];
    },
    enabled: !!lineId,
  });

  const upsertBatch = useMutation({
    mutationFn: async (allocs: Partial<BudgetPeriodAlloc>[]) => {
      // Delete existing then insert
      if (allocs.length > 0 && allocs[0].line_id) {
        await (supabase.from('budget_period_allocs' as any).delete().eq('line_id', allocs[0].line_id) as any);
      }
      const { error } = await (supabase.from('budget_period_allocs' as any).insert(allocs) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-period-allocs'] }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, upsertBatch };
}

export function useBudgetApprovalHistory(versionId?: string) {
  return useQuery({
    queryKey: ['budget-approval-history', versionId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('budget_approval_history' as any).select('*').eq('version_id', versionId).order('acted_at', { ascending: false }) as any);
      if (error) throw error;
      return (data || []) as BudgetApprovalEntry[];
    },
    enabled: !!versionId,
  });
}

export function useBudgetControlRules() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['budget-control-rules', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('budget_control_rules' as any).select('*').order('rule_name') as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as BudgetControlRule[];
    },
    enabled: !!user,
  });

  const upsert = useMutation({
    mutationFn: async (rule: Partial<BudgetControlRule>) => {
      const payload = { ...rule, company_id: rule.company_id || activeCompanyId, created_by: user?.id };
      if (rule.id) {
        const { id, ...updates } = payload;
        const { data, error } = await (supabase.from('budget_control_rules' as any).update(updates).eq('id', id).select().single() as any);
        if (error) throw error;
        return data;
      }
      const { data, error } = await (supabase.from('budget_control_rules' as any).insert(payload).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-control-rules'] }); toast({ title: 'Control rule saved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('budget_control_rules' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-control-rules'] }); toast({ title: 'Rule deleted' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, upsert, remove };
}
