import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const sb = supabase as any;

export interface FiscalCalendar {
  id: string; name: string; country_code: string | null;
  start_month: number; period_count: number; is_active: boolean;
}
export interface PostingPeriod {
  id: string; calendar_id: string; company_id: string | null; fiscal_year: number;
  period_number: number; name: string; start_date: string; end_date: string;
  status: 'open' | 'soft_close' | 'closed' | 'locked'; holidays: any[]; notes: string | null;
}
export interface ChecklistItem {
  id: string; company_id: string | null; phase: string; task: string; description: string | null;
  owner_name: string | null; due_date: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'blocked'; blocks_go_live: boolean;
  notes: string | null; sort_order: number;
}
export interface WizardStep {
  id?: string; company_id: string; step_key: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'; payload: any;
}

// ---- Calendars ----
export function useFiscalCalendars() {
  return useQuery({
    queryKey: ['fiscal-calendars'],
    queryFn: async () => {
      const { data, error } = await sb.from('org_fiscal_calendars').select('*').order('name');
      if (error) throw error;
      return (data || []) as FiscalCalendar[];
    },
  });
}

export function useCreateFiscalCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: Partial<FiscalCalendar>) => {
      const { error } = await sb.from('org_fiscal_calendars').insert(c);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fiscal-calendars'] }); toast.success('Calendar created'); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ---- Periods ----
export function usePostingPeriods(calendarId?: string, fiscalYear?: number) {
  return useQuery({
    queryKey: ['posting-periods', calendarId, fiscalYear],
    queryFn: async () => {
      let q = sb.from('org_posting_calendar_periods').select('*');
      if (calendarId) q = q.eq('calendar_id', calendarId);
      if (fiscalYear) q = q.eq('fiscal_year', fiscalYear);
      const { data, error } = await q.order('period_number');
      if (error) throw error;
      return (data || []) as PostingPeriod[];
    },
    enabled: !!calendarId,
  });
}

export function useGeneratePeriods() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ calendarId, companyId, year }: { calendarId: string; companyId: string | null; year: number }) => {
      const { error } = await sb.rpc('generate_posting_periods', {
        p_calendar_id: calendarId,
        p_company_id: companyId,
        p_fiscal_year: year,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['posting-periods'] }); toast.success('Periods generated'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdatePeriodStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PostingPeriod['status'] }) => {
      const patch: any = { status };
      if (status === 'closed' || status === 'locked') {
        patch.closed_at = new Date().toISOString();
      }
      const { error } = await sb.from('org_posting_calendar_periods').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['posting-periods'] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ---- Checklist ----
export function useChecklist(companyId?: string) {
  return useQuery({
    queryKey: ['impl-checklist', companyId],
    queryFn: async () => {
      let q = sb.from('org_implementation_checklists').select('*');
      if (companyId) q = q.eq('company_id', companyId);
      const { data, error } = await q.order('phase').order('sort_order');
      if (error) throw error;
      return (data || []) as ChecklistItem[];
    },
  });
}

export function useUpsertChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Partial<ChecklistItem> & { task: string; phase: string }) => {
      const patch: any = { ...item };
      if (item.status === 'done' && !item.id) patch.completed_at = new Date().toISOString();
      const { error } = await sb.from('org_implementation_checklists').upsert(patch);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['impl-checklist'] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ---- Wizard ----
export function useWizardState(companyId?: string) {
  return useQuery({
    queryKey: ['wizard-state', companyId],
    queryFn: async () => {
      const { data, error } = await sb.from('org_setup_wizard_state').select('*').eq('company_id', companyId);
      if (error) throw error;
      return (data || []) as WizardStep[];
    },
    enabled: !!companyId,
  });
}

export function useSaveWizardStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (step: WizardStep) => {
      const patch: any = { ...step };
      if (step.status === 'completed') patch.completed_at = new Date().toISOString();
      const { error } = await sb.from('org_setup_wizard_state').upsert(patch, { onConflict: 'company_id,step_key' });
      if (error) throw error;
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ['wizard-state', v.company_id] }); },
    onError: (e: any) => toast.error(e.message),
  });
}
