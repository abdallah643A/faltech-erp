import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface ITTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  requester_id: string | null;
  requester_name: string | null;
  assigned_to_id: string | null;
  assigned_to_name: string | null;
  department: string | null;
  resolution: string | null;
  sla_due_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  impact: string | null;
  urgency: string | null;
  sla_config_id: string | null;
  sla_response_due: string | null;
  sla_resolution_due: string | null;
  first_response_at: string | null;
  sla_response_breached: boolean;
  sla_resolution_breached: boolean;
  escalation_level: number;
  escalated_at: string | null;
  escalated_to: string | null;
  related_change_id: string | null;
  related_problem_id: string | null;
  related_ci_id: string | null;
  source: string | null;
  satisfaction_rating: number | null;
  satisfaction_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface ITComment {
  id: string;
  ticket_id: string;
  comment: string;
  is_internal: boolean;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface ITKBArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  is_published: boolean;
  views: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ITServiceItem {
  id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  category: string;
  estimated_time: string | null;
  requires_approval: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface ITChange {
  id: string;
  change_number: string;
  title: string;
  description: string | null;
  change_type: string;
  risk_level: string;
  impact: string;
  urgency: string;
  priority: string;
  status: string;
  requester_id: string | null;
  requester_name: string | null;
  assigned_to_id: string | null;
  assigned_to_name: string | null;
  category: string;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  rollback_plan: string | null;
  test_plan: string | null;
  cab_required: boolean;
  cab_approval_status: string;
  cab_approved_by: string | null;
  cab_approved_at: string | null;
  cab_notes: string | null;
  implementation_notes: string | null;
  post_implementation_review: string | null;
  related_tickets: string[] | null;
  affected_services: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ITProblem {
  id: string;
  problem_number: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  impact: string | null;
  root_cause: string | null;
  workaround: string | null;
  known_error: boolean;
  assigned_to_id: string | null;
  assigned_to_name: string | null;
  related_tickets: string[] | null;
  affected_services: string[] | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ITCMDB {
  id: string;
  ci_id: string;
  name: string;
  ci_type: string;
  ci_class: string;
  status: string;
  environment: string;
  owner_name: string | null;
  department: string | null;
  location: string | null;
  ip_address: string | null;
  os: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  warranty_end: string | null;
  criticality: string;
  dependencies: string[] | null;
  related_services: string[] | null;
  notes: string | null;
  last_audit_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ITSLAConfig {
  id: string;
  name: string;
  priority: string;
  response_time_hours: number;
  resolution_time_hours: number;
  escalation_after_hours: number | null;
  escalation_to: string | null;
  business_hours_only: boolean;
  is_active: boolean;
  created_at: string;
}

export function useITSM() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const ticketsQuery = useQuery({
    queryKey: ['it-tickets', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('it_tickets').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as ITTicket[];
    },
  });

  const kbQuery = useQuery({
    queryKey: ['it-kb', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('it_knowledge_base').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as ITKBArticle[];
    },
  });

  const catalogQuery = useQuery({
    queryKey: ['it-catalog', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('it_service_catalog').select('*').order('sort_order');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as ITServiceItem[];
    },
  });

  const changesQuery = useQuery({
    queryKey: ['it-changes', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('it_changes' as any).select('*').order('created_at', { ascending: false }) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ITChange[];
    },
  });

  const problemsQuery = useQuery({
    queryKey: ['it-problems', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('it_problems' as any).select('*').order('created_at', { ascending: false }) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ITProblem[];
    },
  });

  const cmdbQuery = useQuery({
    queryKey: ['it-cmdb', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('it_cmdb' as any).select('*').order('created_at', { ascending: false }) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ITCMDB[];
    },
  });

  const slaQuery = useQuery({
    queryKey: ['it-sla', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('it_sla_configs' as any).select('*').order('priority') as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ITSLAConfig[];
    },
  });

  const cid = activeCompanyId ? { company_id: activeCompanyId } : {};

  // Ticket CRUD
  const createTicket = useMutation({
    mutationFn: async (data: Partial<ITTicket>) => {
      const num = 'TKT-' + String(Date.now()).slice(-6);
      const { error } = await supabase.from('it_tickets').insert({
        ...data, ticket_number: num, requester_id: user?.id,
        requester_name: profile?.full_name || user?.email, ...cid,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it-tickets'] }),
  });

  const updateTicket = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ITTicket> & { id: string }) => {
      const updates: any = { ...data, updated_at: new Date().toISOString() };
      if (data.status === 'In Progress' && !data.first_response_at) updates.first_response_at = new Date().toISOString();
      if (data.status === 'Resolved' && !data.resolved_at) updates.resolved_at = new Date().toISOString();
      if (data.status === 'Closed' && !data.closed_at) updates.closed_at = new Date().toISOString();
      const { error } = await supabase.from('it_tickets').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it-tickets'] }),
  });

  const deleteTicket = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('it_tickets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it-tickets'] }),
  });

  // Comments
  const useTicketComments = (ticketId: string | null) => useQuery({
    queryKey: ['it-comments', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase.from('it_ticket_comments').select('*').eq('ticket_id', ticketId).order('created_at');
      if (error) throw error;
      return data as ITComment[];
    },
    enabled: !!ticketId,
  });

  const addComment = useMutation({
    mutationFn: async (data: { ticket_id: string; comment: string; is_internal?: boolean }) => {
      const { error } = await supabase.from('it_ticket_comments').insert({
        ...data, created_by: user?.id, created_by_name: profile?.full_name || user?.email,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ['it-comments', vars.ticket_id] }),
  });

  // KB CRUD
  const createKBArticle = useMutation({
    mutationFn: async (data: Partial<ITKBArticle>) => {
      const { error } = await supabase.from('it_knowledge_base').insert({ ...data, created_by: user?.id, ...cid } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it-kb'] }),
  });

  const updateKBArticle = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ITKBArticle> & { id: string }) => {
      const { error } = await supabase.from('it_knowledge_base').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it-kb'] }),
  });

  const deleteKBArticle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('it_knowledge_base').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it-kb'] }),
  });

  // Catalog CRUD
  const createServiceItem = useMutation({
    mutationFn: async (data: Partial<ITServiceItem>) => {
      const { error } = await supabase.from('it_service_catalog').insert({ ...data, ...cid } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it-catalog'] }),
  });

  const updateServiceItem = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ITServiceItem> & { id: string }) => {
      const { error } = await supabase.from('it_service_catalog').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it-catalog'] }),
  });

  const deleteServiceItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('it_service_catalog').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it-catalog'] }),
  });

  // Change Management CRUD
  const createChange = useMutation({
    mutationFn: async (data: Partial<ITChange>) => {
      const num = 'CHG-' + String(Date.now()).slice(-6);
      const { error } = await (supabase.from('it_changes' as any).insert({
        ...data, change_number: num, requester_id: user?.id, requester_name: profile?.full_name || user?.email, ...cid,
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it-changes'] }),
  });

  const updateChange = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ITChange> & { id: string }) => {
      const { error } = await (supabase.from('it_changes' as any).update({ ...data, updated_at: new Date().toISOString() }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it-changes'] }),
  });

  const deleteChange = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('it_changes' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it-changes'] }),
  });

  // Problem Management CRUD
  const createProblem = useMutation({
    mutationFn: async (data: Partial<ITProblem>) => {
      const num = 'PRB-' + String(Date.now()).slice(-6);
      const { error } = await (supabase.from('it_problems' as any).insert({
        ...data, problem_number: num, created_by: user?.id, ...cid,
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it-problems'] }),
  });

  const updateProblem = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ITProblem> & { id: string }) => {
      const updates: any = { ...data, updated_at: new Date().toISOString() };
      if (data.status === 'Resolved' && !data.resolved_at) updates.resolved_at = new Date().toISOString();
      if (data.status === 'Closed' && !data.closed_at) updates.closed_at = new Date().toISOString();
      const { error } = await (supabase.from('it_problems' as any).update(updates).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it-problems'] }),
  });

  const deleteProblem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('it_problems' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it-problems'] }),
  });

  // CMDB CRUD
  const createCI = useMutation({
    mutationFn: async (data: Partial<ITCMDB>) => {
      const ciId = 'CI-' + String(Date.now()).slice(-6);
      const { error } = await (supabase.from('it_cmdb' as any).insert({ ...data, ci_id: ciId, ...cid }) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it-cmdb'] }),
  });

  const updateCI = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ITCMDB> & { id: string }) => {
      const { error } = await (supabase.from('it_cmdb' as any).update({ ...data, updated_at: new Date().toISOString() }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it-cmdb'] }),
  });

  const deleteCI = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('it_cmdb' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it-cmdb'] }),
  });

  // SLA Config CRUD
  const createSLA = useMutation({
    mutationFn: async (data: Partial<ITSLAConfig>) => {
      const { error } = await (supabase.from('it_sla_configs' as any).insert({ ...data, ...cid }) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it-sla'] }),
  });

  const updateSLA = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ITSLAConfig> & { id: string }) => {
      const { error } = await (supabase.from('it_sla_configs' as any).update(data).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it-sla'] }),
  });

  const deleteSLA = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('it_sla_configs' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['it-sla'] }),
  });

  return {
    tickets: ticketsQuery.data || [],
    ticketsLoading: ticketsQuery.isLoading,
    kbArticles: kbQuery.data || [],
    catalog: catalogQuery.data || [],
    changes: changesQuery.data || [],
    changesLoading: changesQuery.isLoading,
    problems: problemsQuery.data || [],
    problemsLoading: problemsQuery.isLoading,
    cmdbItems: cmdbQuery.data || [],
    cmdbLoading: cmdbQuery.isLoading,
    slaConfigs: slaQuery.data || [],
    createTicket, updateTicket, deleteTicket,
    useTicketComments, addComment,
    createKBArticle, updateKBArticle, deleteKBArticle,
    createServiceItem, updateServiceItem, deleteServiceItem,
    createChange, updateChange, deleteChange,
    createProblem, updateProblem, deleteProblem,
    createCI, updateCI, deleteCI,
    createSLA, updateSLA, deleteSLA,
  };
}
