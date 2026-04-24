import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { corrTables, type CorrespondenceRow, type CorrDirection, type CorrStatus } from '@/integrations/supabase/correspondence-tables';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ---------- Types & Categories ----------
export function useCorrTypes(direction?: CorrDirection) {
  return useQuery({
    queryKey: ['corr-types', direction],
    queryFn: async () => {
      let q = corrTables.types().select('*').eq('is_active', true).order('code');
      if (direction) q = q.eq('direction', direction);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCorrCategories() {
  return useQuery({
    queryKey: ['corr-categories'],
    queryFn: async () => {
      const { data, error } = await corrTables.categories().select('*').eq('is_active', true).order('code');
      if (error) throw error;
      return data as any[];
    },
  });
}

// ---------- List & Filters ----------
export interface CorrFilters {
  direction?: CorrDirection;
  status?: CorrStatus | CorrStatus[];
  search?: string;
  priority?: string;
  confidentiality?: string;
  assignee?: string;
  dateFrom?: string;
  dateTo?: string;
  typeId?: string;
  projectId?: string;
  ecmStatus?: string;
  limit?: number;
}

export function useCorrespondenceList(filters: CorrFilters = {}) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['correspondence-list', activeCompanyId, filters],
    queryFn: async () => {
      let q = corrTables.correspondence().select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (filters.direction) q = q.eq('direction', filters.direction);
      if (filters.status) q = Array.isArray(filters.status) ? q.in('status', filters.status) : q.eq('status', filters.status);
      if (filters.priority) q = q.eq('priority', filters.priority);
      if (filters.confidentiality) q = q.eq('confidentiality', filters.confidentiality);
      if (filters.assignee) q = q.eq('current_assignee', filters.assignee);
      if (filters.typeId) q = q.eq('type_id', filters.typeId);
      if (filters.projectId) q = q.eq('related_project_id', filters.projectId);
      if (filters.ecmStatus) q = q.eq('ecm_sync_status', filters.ecmStatus);
      if (filters.dateFrom) q = q.gte('correspondence_date', filters.dateFrom);
      if (filters.dateTo) q = q.lte('correspondence_date', filters.dateTo);
      if (filters.search) q = q.or(`subject.ilike.%${filters.search}%,reference_no.ilike.%${filters.search}%,external_reference.ilike.%${filters.search}%`);
      if (filters.limit) q = q.limit(filters.limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CorrespondenceRow[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useCorrespondence(id: string | undefined) {
  return useQuery({
    queryKey: ['correspondence', id],
    queryFn: async () => {
      const { data, error } = await corrTables.correspondence().select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data as CorrespondenceRow | null;
    },
    enabled: !!id,
  });
}

// ---------- Create / Update / Status transitions ----------
export function useCreateCorrespondence() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<CorrespondenceRow>) => {
      const payload = {
        ...input,
        company_id: input.company_id ?? activeCompanyId,
        created_by: input.created_by ?? user?.id,
        owner_user_id: input.owner_user_id ?? user?.id,
        status: input.status ?? 'draft',
      };
      const { data, error } = await corrTables.correspondence().insert(payload).select().single();
      if (error) throw error;
      return data as CorrespondenceRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['correspondence-list'] });
      toast.success('Correspondence created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCorrespondence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CorrespondenceRow> }) => {
      const { data, error } = await corrTables.correspondence().update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['correspondence', vars.id] });
      qc.invalidateQueries({ queryKey: ['correspondence-list'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useChangeStatus() {
  const update = useUpdateCorrespondence();
  return useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: CorrStatus; note?: string }) => {
      await update.mutateAsync({ id, patch: { status, ...(status === 'closed' ? { closed_at: new Date().toISOString() } : {}) } });
      if (note) {
        await corrTables.audit().insert({ correspondence_id: id, action: 'note', notes: note });
      }
    },
    onSuccess: () => toast.success('Status updated'),
  });
}

// ---------- Attachments + ECM ----------
export function useCorrAttachments(correspondenceId: string | undefined) {
  return useQuery({
    queryKey: ['corr-attachments', correspondenceId],
    queryFn: async () => {
      const { data, error } = await corrTables.attachments().select('*').eq('correspondence_id', correspondenceId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!correspondenceId,
  });
}

export function useUploadCorrAttachment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ correspondenceId, file, kind = 'attachment' }: { correspondenceId: string; file: File; kind?: string }) => {
      const path = `${correspondenceId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('correspondence').upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('correspondence').getPublicUrl(path);
      const { error } = await corrTables.attachments().insert({
        correspondence_id: correspondenceId,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        mime_type: file.type,
        kind,
        ecm_sync_status: 'synced', // Lovable Cloud Storage IS the ECM
        uploaded_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['corr-attachments', vars.correspondenceId] });
      toast.success('File uploaded');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------- Assignments ----------
export function useCorrAssignments(correspondenceId: string | undefined) {
  return useQuery({
    queryKey: ['corr-assignments', correspondenceId],
    queryFn: async () => {
      const { data, error } = await corrTables.assignments().select('*').eq('correspondence_id', correspondenceId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!correspondenceId,
  });
}

export function useAssignCorrespondence() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  return useMutation({
    mutationFn: async (input: { correspondenceId: string; assignedTo: string; assignedToName?: string; department?: string; actionRequired?: string; dueDate?: string; notes?: string }) => {
      const { error } = await corrTables.assignments().insert({
        correspondence_id: input.correspondenceId,
        assigned_to: input.assignedTo,
        assigned_to_name: input.assignedToName,
        department: input.department,
        action_required: input.actionRequired,
        due_date: input.dueDate,
        notes: input.notes,
        assigned_by: user?.id,
        assigned_by_name: profile?.full_name || profile?.email,
      });
      if (error) throw error;
      await corrTables.correspondence().update({
        current_assignee: input.assignedTo,
        current_department: input.department,
        status: 'assigned',
      }).eq('id', input.correspondenceId);
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['corr-assignments', v.correspondenceId] });
      qc.invalidateQueries({ queryKey: ['correspondence', v.correspondenceId] });
      toast.success('Assigned');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------- Comments ----------
export function useCorrComments(correspondenceId: string | undefined) {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  const key = ['corr-comments', correspondenceId];
  const list = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await corrTables.comments().select('*').eq('correspondence_id', correspondenceId).order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!correspondenceId,
  });
  const add = useMutation({
    mutationFn: async ({ text, isInternal = true }: { text: string; isInternal?: boolean }) => {
      const { error } = await corrTables.comments().insert({
        correspondence_id: correspondenceId,
        comment_text: text,
        is_internal: isInternal,
        user_id: user?.id,
        user_name: profile?.full_name || profile?.email,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  return { ...list, addComment: add.mutate, isAdding: add.isPending };
}

// ---------- Audit & ECM monitor ----------
export function useCorrAudit(correspondenceId: string | undefined) {
  return useQuery({
    queryKey: ['corr-audit', correspondenceId],
    queryFn: async () => {
      const { data, error } = await corrTables.audit().select('*').eq('correspondence_id', correspondenceId).order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!correspondenceId,
  });
}

export function useEcmSyncMonitor(status?: string) {
  return useQuery({
    queryKey: ['corr-ecm-monitor', status],
    queryFn: async () => {
      let q = corrTables.ecmSync().select('*').order('created_at', { ascending: false }).limit(200);
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

// ---------- Dispatch ----------
export function useDispatchCorrespondence() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  return useMutation({
    mutationFn: async (input: { correspondenceId: string; channel: string; trackingNumber?: string; carrier?: string; notes?: string }) => {
      const { error } = await corrTables.dispatch().insert({
        correspondence_id: input.correspondenceId,
        channel: input.channel,
        tracking_number: input.trackingNumber,
        carrier: input.carrier,
        notes: input.notes,
        dispatched_by: user?.id,
        dispatched_by_name: profile?.full_name || profile?.email,
      });
      if (error) throw error;
      await corrTables.correspondence().update({ status: 'dispatched', dispatch_date: new Date().toISOString() }).eq('id', input.correspondenceId);
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['correspondence', v.correspondenceId] });
      toast.success('Dispatched');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------- Workflow ----------
export function useCorrWorkflowDefs(direction?: CorrDirection) {
  return useQuery({
    queryKey: ['corr-wf-defs', direction],
    queryFn: async () => {
      let q = corrTables.workflowDefs().select('*, corr_workflow_steps(*)').eq('is_active', true);
      if (direction) q = q.eq('direction', direction);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

// ---------- Dashboard KPIs ----------
export function useCorrespondenceKPIs() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['corr-kpis', activeCompanyId],
    queryFn: async () => {
      const base = corrTables.correspondence().select('id, direction, status, priority, due_date, ecm_sync_status, created_at', { count: 'exact', head: false });
      const { data, error } = activeCompanyId ? await base.eq('company_id', activeCompanyId) : await base;
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const today = new Date();
      const overdue = rows.filter(r => r.due_date && new Date(r.due_date) < today && !['closed','archived','cancelled'].includes(r.status)).length;
      const open = rows.filter(r => !['closed','archived','cancelled'].includes(r.status)).length;
      return {
        total: rows.length,
        incoming: rows.filter(r => r.direction === 'incoming').length,
        outgoing: rows.filter(r => r.direction === 'outgoing').length,
        open,
        overdue,
        urgent: rows.filter(r => ['urgent','critical'].includes(r.priority)).length,
        ecmFailed: rows.filter(r => r.ecm_sync_status === 'failed').length,
        byStatus: rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {}),
      };
    },
    enabled: !!activeCompanyId,
  });
}
