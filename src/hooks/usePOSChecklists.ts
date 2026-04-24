import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface ChecklistTemplate {
  id: string;
  template_name: string;
  shift_type: 'opening' | 'closing';
  branch_id: string | null;
  is_active: boolean;
  description: string | null;
}

export interface ChecklistRunItem {
  id: string;
  title: string;
  is_required: boolean;
  is_completed: boolean;
  count_value: number | null;
  photo_url: string | null;
  notes: string | null;
  sort_order: number;
}

export function usePOSChecklists() {
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['pos-checklist-templates', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('pos_checklist_templates' as any).select('*, items:pos_checklist_template_items(*)')
        .eq('company_id', activeCompanyId!).order('created_at', { ascending: false }));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const { data: runs, isLoading: loadingRuns } = useQuery({
    queryKey: ['pos-checklist-runs', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('pos_checklist_runs' as any).select('*, items:pos_checklist_run_items(*)')
        .eq('company_id', activeCompanyId!).order('started_at', { ascending: false }).limit(100));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });

  const createTemplate = useMutation({
    mutationFn: async (payload: { template_name: string; shift_type: 'opening' | 'closing'; branch_id?: string; description?: string; items: Array<{ title: string; is_required?: boolean; requires_photo?: boolean; requires_count?: boolean; category?: string }> }) => {
      const { data: tpl, error } = await (supabase.from('pos_checklist_templates' as any).insert({
        company_id: activeCompanyId,
        template_name: payload.template_name,
        shift_type: payload.shift_type,
        branch_id: payload.branch_id ?? null,
        description: payload.description ?? null,
      }).select().single());
      if (error) throw error;
      const tplId = (tpl as any).id;
      if (payload.items?.length) {
        const rows = payload.items.map((it, idx) => ({
          template_id: tplId,
          sort_order: idx,
          title: it.title,
          category: it.category ?? null,
          is_required: it.is_required ?? true,
          requires_photo: it.requires_photo ?? false,
          requires_count: it.requires_count ?? false,
        }));
        const { error: e2 } = await (supabase.from('pos_checklist_template_items' as any).insert(rows));
        if (e2) throw e2;
      }
      return tpl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-checklist-templates'] });
      toast({ title: 'Template created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const startRun = useMutation({
    mutationFn: async (payload: { template_id: string; shift_id?: string; cashier_name?: string; branch_id?: string; terminal_id?: string }) => {
      const { data: tpl, error: e0 } = await (supabase.from('pos_checklist_templates' as any).select('*, items:pos_checklist_template_items(*)').eq('id', payload.template_id).single());
      if (e0) throw e0;
      const t = tpl as any;
      const { data: run, error: e1 } = await (supabase.from('pos_checklist_runs' as any).insert({
        company_id: activeCompanyId,
        template_id: t.id,
        shift_id: payload.shift_id ?? null,
        shift_type: t.shift_type,
        cashier_name: payload.cashier_name ?? null,
        branch_id: payload.branch_id ?? t.branch_id,
        terminal_id: payload.terminal_id ?? null,
      }).select().single());
      if (e1) throw e1;
      const items = (t.items || []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((it: any) => ({
        run_id: (run as any).id,
        template_item_id: it.id,
        title: it.title,
        is_required: it.is_required,
        sort_order: it.sort_order,
      }));
      if (items.length) {
        const { error: e2 } = await (supabase.from('pos_checklist_run_items' as any).insert(items));
        if (e2) throw e2;
      }
      return run;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-checklist-runs'] });
      toast({ title: 'Checklist started' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateRunItem = useMutation({
    mutationFn: async (payload: { item_id: string; is_completed?: boolean; notes?: string; count_value?: number; photo_url?: string }) => {
      const patch: any = {};
      if (payload.is_completed !== undefined) {
        patch.is_completed = payload.is_completed;
        patch.completed_at = payload.is_completed ? new Date().toISOString() : null;
      }
      if (payload.notes !== undefined) patch.notes = payload.notes;
      if (payload.count_value !== undefined) patch.count_value = payload.count_value;
      if (payload.photo_url !== undefined) patch.photo_url = payload.photo_url;
      const { error } = await (supabase.from('pos_checklist_run_items' as any).update(patch).eq('id', payload.item_id));
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pos-checklist-runs'] }),
  });

  const completeRun = useMutation({
    mutationFn: async (run_id: string) => {
      const { error } = await (supabase.from('pos_checklist_runs' as any).update({
        status: 'completed', completed_at: new Date().toISOString(),
      }).eq('id', run_id));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-checklist-runs'] });
      toast({ title: 'Checklist completed' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { templates, runs, isLoading: loadingTemplates || loadingRuns, createTemplate, startRun, updateRunItem, completeRun };
}

export function useCashierKPIs() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['pos-cashier-kpis', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('v_pos_cashier_kpis' as any).select('*')
        .eq('company_id', activeCompanyId!).order('total_sales', { ascending: false }));
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCompanyId,
  });
}
