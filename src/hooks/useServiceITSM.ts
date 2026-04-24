import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type TicketStatus = 'new' | 'assigned' | 'in_progress' | 'pending_customer' | 'resolved' | 'closed' | 'cancelled';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

// ===== Tickets =====
export function useServiceTickets(filters?: { status?: TicketStatus; assignee?: string; priority?: TicketPriority }) {
  return useQuery({
    queryKey: ['svc-tickets', filters],
    queryFn: async () => {
      let q = supabase.from('svc_tickets').select('*, svc_technicians(technician_name), svc_sla_policies(policy_name)')
        .order('created_at', { ascending: false }).limit(500);
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.priority) q = q.eq('priority', filters.priority);
      if (filters?.assignee) q = q.eq('assigned_technician_id', filters.assignee);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTicket(id?: string) {
  return useQuery({
    queryKey: ['svc-ticket', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('svc_tickets').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const ticket_number = payload.ticket_number || `TKT-${Date.now().toString().slice(-8)}`;
      const { data, error } = await supabase.from('svc_tickets').insert({ ...payload, ticket_number }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['svc-tickets'] });
      toast.success('Ticket created');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      const { data, error } = await supabase.from('svc_tickets').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars: any) => {
      qc.invalidateQueries({ queryKey: ['svc-tickets'] });
      qc.invalidateQueries({ queryKey: ['svc-ticket', vars.id] });
      toast.success('Ticket updated');
    },
  });
}

// ===== Comments =====
export function useTicketComments(ticketId?: string) {
  return useQuery({
    queryKey: ['svc-comments', ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase.from('svc_ticket_comments').select('*').eq('ticket_id', ticketId!).order('created_at');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { ticket_id: string; message: string; channel?: string; author_name?: string }) => {
      const { data, error } = await supabase.from('svc_ticket_comments').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['svc-comments', v.ticket_id] });
      qc.invalidateQueries({ queryKey: ['svc-ticket', v.ticket_id] });
    },
  });
}

// ===== SLA Policies =====
export function useSLAPolicies() {
  return useQuery({
    queryKey: ['svc-sla-policies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('svc_sla_policies').select('*').order('priority');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertSLAPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from('svc_sla_policies').upsert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['svc-sla-policies'] });
      toast.success('SLA policy saved');
    },
  });
}

// ===== Technicians =====
export function useTechnicians() {
  return useQuery({
    queryKey: ['svc-technicians'],
    queryFn: async () => {
      const { data, error } = await supabase.from('svc_technicians').select('*').eq('is_active', true).order('technician_name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertTechnician() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from('svc_technicians').upsert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['svc-technicians'] }); toast.success('Technician saved'); },
  });
}

// ===== Field Visits =====
export function useFieldVisits(date?: string) {
  return useQuery({
    queryKey: ['svc-visits', date],
    queryFn: async () => {
      let q = supabase.from('svc_field_visits').select('*, svc_technicians(technician_name), svc_tickets(ticket_number,title)').order('scheduled_start');
      if (date) {
        const start = `${date}T00:00:00`;
        const end = `${date}T23:59:59`;
        q = q.gte('scheduled_start', start).lte('scheduled_start', end);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useScheduleVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from('svc_field_visits').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['svc-visits'] }); toast.success('Visit scheduled'); },
  });
}

// ===== AI Dispatch =====
export function useAIDispatchSuggestion() {
  return useMutation({
    mutationFn: async (payload: { ticket_id: string }) => {
      const { data, error } = await supabase.functions.invoke('svc-ai-dispatch', { body: payload });
      if (error) throw error;
      return data;
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ===== Contracts =====
export function useServiceContracts() {
  return useQuery({
    queryKey: ['svc-contracts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('svc_contracts').select('*, svc_sla_policies(policy_name)').order('end_date');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from('svc_contracts').upsert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['svc-contracts'] }); toast.success('Contract saved'); },
  });
}

// ===== KB Articles =====
export function useKBArticles(filters?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ['svc-kb', filters],
    queryFn: async () => {
      let q = supabase.from('svc_kb_articles').select('*').order('updated_at', { ascending: false });
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.search) q = q.ilike('title', `%${filters.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertKBArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const article_number = payload.article_number || `KB-${Date.now().toString().slice(-8)}`;
      const { data, error } = await supabase.from('svc_kb_articles').upsert({ ...payload, article_number }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['svc-kb'] }); toast.success('Article saved'); },
  });
}

// ===== Escalations =====
export function useEscalations(status?: string) {
  return useQuery({
    queryKey: ['svc-escalations', status],
    queryFn: async () => {
      let q = supabase.from('svc_escalations').select('*, svc_tickets(ticket_number,title,priority)').order('created_at', { ascending: false });
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ===== Asset Service History =====
export function useAssetServiceHistory(assetId?: string) {
  return useQuery({
    queryKey: ['svc-asset-history', assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await supabase.from('svc_tickets').select('*').eq('asset_id', assetId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ===== Analytics =====
export function useServiceMetrics(days = 30) {
  return useQuery({
    queryKey: ['svc-metrics', days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data: tickets } = await supabase.from('svc_tickets').select('status,priority,is_breached,first_response_at,resolved_at,created_at,due_resolution_at').gte('created_at', since);
      const list = tickets ?? [];
      const total = list.length;
      const breached = list.filter((t: any) => t.is_breached).length;
      const resolved = list.filter((t: any) => t.resolved_at);
      const open = list.filter((t: any) => !['resolved', 'closed', 'cancelled'].includes(t.status)).length;
      const avgFR = list.filter((t: any) => t.first_response_at).reduce((s: number, t: any) => s + (new Date(t.first_response_at).getTime() - new Date(t.created_at).getTime()) / 60000, 0) / Math.max(1, list.filter((t: any) => t.first_response_at).length);
      const avgMTTR = resolved.reduce((s: number, t: any) => s + (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 60000, 0) / Math.max(1, resolved.length);
      return {
        total, open, resolved: resolved.length, breached,
        breach_rate: total ? +(breached / total * 100).toFixed(1) : 0,
        avg_first_response_min: Math.round(avgFR || 0),
        avg_resolution_min: Math.round(avgMTTR || 0),
        by_priority: ['low', 'medium', 'high', 'critical'].map(p => ({ priority: p, count: list.filter((t: any) => t.priority === p).length })),
      };
    },
  });
}

// ===== Maintenance Link =====
export function useLinkMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from('svc_maintenance_links').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['svc-tickets'] }); toast.success('Maintenance linked'); },
  });
}
