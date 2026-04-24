import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useWorkbooks() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const query = useQuery({
    queryKey: ['ss-workbooks', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('spreadsheet_workbooks').select('*').order('updated_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (wb: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('spreadsheet_workbooks').insert({
        ...wb,
        company_id: activeCompanyId,
        owner_id: user?.id,
        owner_name: user?.email,
        created_by: user?.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ss-workbooks'] }); toast.success('Workbook created'); },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...rest }: any) => {
      const { error } = await supabase.from('spreadsheet_workbooks').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ss-workbooks'] }); toast.success('Workbook updated'); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('spreadsheet_workbooks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ss-workbooks'] }); toast.success('Workbook deleted'); },
  });

  return { ...query, create, update, remove };
}

export function useTemplates() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const query = useQuery({
    queryKey: ['ss-templates', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('spreadsheet_templates').select('*').order('name');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (t: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('spreadsheet_templates').insert({
        ...t, company_id: activeCompanyId, created_by: user?.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ss-templates'] }); toast.success('Template created'); },
  });

  return { ...query, create };
}

export function useSheets(workbookId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['ss-sheets', workbookId],
    queryFn: async () => {
      const { data, error } = await supabase.from('spreadsheet_sheets').select('*').eq('workbook_id', workbookId!).order('sheet_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workbookId,
  });

  const create = useMutation({
    mutationFn: async (s: any) => {
      const { data, error } = await supabase.from('spreadsheet_sheets').insert(s).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ss-sheets'] }),
  });

  return { ...query, create };
}

export function useCells(sheetId?: string, scenarioId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['ss-cells', sheetId, scenarioId],
    queryFn: async () => {
      let q = supabase.from('spreadsheet_cells').select('*').eq('sheet_id', sheetId!);
      if (scenarioId) q = q.eq('scenario_id', scenarioId);
      else q = q.is('scenario_id', null);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!sheetId,
  });

  const upsert = useMutation({
    mutationFn: async (cell: any) => {
      const { data, error } = await supabase.from('spreadsheet_cells').upsert(cell, { onConflict: 'sheet_id,row_index,col_index,scenario_id' }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ss-cells'] }),
  });

  return { ...query, upsert };
}

export function useScenarios(workbookId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['ss-scenarios', workbookId],
    queryFn: async () => {
      const { data, error } = await supabase.from('spreadsheet_scenarios').select('*').eq('workbook_id', workbookId!).order('created_at');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workbookId,
  });

  const create = useMutation({
    mutationFn: async (s: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('spreadsheet_scenarios').insert({ ...s, created_by: user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ss-scenarios'] }); toast.success('Scenario created'); },
  });

  return { ...query, create };
}

export function useSSComments(sheetId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['ss-comments', sheetId],
    queryFn: async () => {
      const { data, error } = await supabase.from('spreadsheet_comments').select('*').eq('sheet_id', sheetId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!sheetId,
  });

  const create = useMutation({
    mutationFn: async (c: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('spreadsheet_comments').insert({ ...c, author_id: user?.id, author_name: user?.email }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ss-comments'] }),
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('spreadsheet_comments').update({ is_resolved: true, resolved_by: user?.id, resolved_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ss-comments'] }),
  });

  return { ...query, create, resolve };
}

export function useVersions(workbookId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['ss-versions', workbookId],
    queryFn: async () => {
      const { data, error } = await supabase.from('spreadsheet_versions').select('*').eq('workbook_id', workbookId!).order('version_number', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workbookId,
  });

  const create = useMutation({
    mutationFn: async (v: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('spreadsheet_versions').insert({ ...v, created_by: user?.id, created_by_name: user?.email }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ss-versions'] }); toast.success('Version saved'); },
  });

  return { ...query, create };
}

export function useWritebacks(workbookId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['ss-writebacks', workbookId],
    queryFn: async () => {
      let q = supabase.from('spreadsheet_writebacks').select('*').order('created_at', { ascending: false });
      if (workbookId) q = q.eq('workbook_id', workbookId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const submit = useMutation({
    mutationFn: async (wb: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('spreadsheet_writebacks').insert({
        ...wb, submitted_by: user?.id, submitted_by_name: user?.email,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ss-writebacks'] }); toast.success('Writeback submitted for approval'); },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('spreadsheet_writebacks').update({
        status: 'approved', approved_by: user?.id, approved_by_name: user?.email, approved_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ss-writebacks'] }); toast.success('Writeback approved'); },
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase.from('spreadsheet_writebacks').update({ status: 'rejected', rejected_reason: reason }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ss-writebacks'] }); toast.success('Writeback rejected'); },
  });

  return { ...query, submit, approve, reject };
}
