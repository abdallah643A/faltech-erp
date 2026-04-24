import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { QAProject, QAPlan, QAPlanRevision, QATicket, QATicketComment, QATicketMedia, QATemplate } from '@/components/qaqc/plan-viewer/types';

export function useQAProjects() {
  return useQuery({
    queryKey: ['qa-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as QAProject[];
    },
  });
}

export function useQAPlans(projectId: string | null) {
  return useQuery({
    queryKey: ['qa-plans', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_project_plans')
        .select('*')
        .eq('qa_project_id', projectId!)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as QAPlan[];
    },
  });
}

export function useQAPlanRevisions(planId: string | null) {
  return useQuery({
    queryKey: ['qa-plan-revisions', planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_plan_revisions')
        .select('*')
        .eq('plan_id', planId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as QAPlanRevision[];
    },
  });
}

export function useQATickets(projectId: string | null, planId?: string | null) {
  return useQuery({
    queryKey: ['qa-tickets', projectId, planId],
    enabled: !!projectId,
    queryFn: async () => {
      let q = supabase
        .from('qa_tickets')
        .select('*')
        .eq('qa_project_id', projectId!)
        .order('created_at', { ascending: false });
      if (planId) q = q.eq('plan_id', planId);
      const { data, error } = await q;
      if (error) throw error;
      return data as QATicket[];
    },
  });
}

export function useQATicketComments(ticketId: string | null) {
  return useQuery({
    queryKey: ['qa-ticket-comments', ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_ticket_comments')
        .select('*')
        .eq('ticket_id', ticketId!)
        .order('created_at');
      if (error) throw error;
      return data as QATicketComment[];
    },
  });
}

export function useQATicketMedia(ticketId: string | null) {
  return useQuery({
    queryKey: ['qa-ticket-media', ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_ticket_media')
        .select('*')
        .eq('ticket_id', ticketId!)
        .order('created_at');
      if (error) throw error;
      return data as QATicketMedia[];
    },
  });
}

export function useQATemplates() {
  return useQuery({
    queryKey: ['qa-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_ticket_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as QATemplate[];
    },
  });
}

export function useCreateQATicket() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (ticket: Partial<QATicket>) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', userData.user?.id ?? '')
        .single();
      const insertData = {
          ...ticket,
          created_by: userData.user?.id,
          created_by_name: profile?.full_name || userData.user?.email,
        } as any;
      const { data, error } = await supabase
        .from('qa_tickets')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data as QATicket;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['qa-tickets'] });
      toast({ title: 'Ticket created', description: data.ticket_number });
    },
    onError: (err: any) => {
      toast({ title: 'Error creating ticket', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateQATicket() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QATicket> & { id: string }) => {
      const { data, error } = await supabase
        .from('qa_tickets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as QATicket;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qa-tickets'] });
    },
    onError: (err: any) => {
      toast({ title: 'Error updating ticket', description: err.message, variant: 'destructive' });
    },
  });
}

export function useAddQAComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (comment: { ticket_id: string; comment_text: string; is_internal?: boolean; is_system?: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', userData.user?.id ?? '')
        .single();
      const { data, error } = await supabase
        .from('qa_ticket_comments')
        .insert({
          ...comment,
          user_id: userData.user?.id,
          user_name: profile?.full_name || 'User',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['qa-ticket-comments', vars.ticket_id] });
    },
  });
}

export function useUploadQAMedia() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ ticketId, file, isBefore }: { ticketId: string; file: File; isBefore?: boolean }) => {
      const path = `tickets/${ticketId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('qa-media').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('qa-media').getPublicUrl(path);
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', userData.user?.id ?? '').single();
      const { error } = await supabase.from('qa_ticket_media').insert({
        ticket_id: ticketId,
        file_url: publicUrl,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        media_type: file.type.startsWith('video') ? 'video' : file.type.startsWith('image') ? 'photo' : 'file',
        is_before: isBefore || false,
        uploaded_by: userData.user?.id,
        uploaded_by_name: profile?.full_name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qa-ticket-media'] });
      toast({ title: 'Media uploaded' });
    },
  });
}

export function useCreateQAProject() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (project: { name: string; description?: string; project_id?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('qa_projects')
        .insert({ ...project, created_by: userData.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as QAProject;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qa-projects'] });
      toast({ title: 'QA Project created' });
    },
  });
}

export function useCreateQAPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: Partial<QAPlan> & { qa_project_id: string; plan_title: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('qa_project_plans')
        .insert({ ...plan, created_by: userData.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as QAPlan;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['qa-plans', vars.qa_project_id] });
    },
  });
}

export function useUploadPlanRevision() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ planId, file, revisionCode }: { planId: string; file: File; revisionCode: string }) => {
      const path = `plans/${planId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('qa-media').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('qa-media').getPublicUrl(path);
      const { data: userData } = await supabase.auth.getUser();
      // Mark old revisions as not current
      await supabase.from('qa_plan_revisions').update({ is_current: false }).eq('plan_id', planId);
      const { data, error } = await supabase.from('qa_plan_revisions').insert({
        plan_id: planId,
        revision_code: revisionCode,
        file_url: publicUrl,
        file_name: file.name,
        mime_type: file.type,
        is_current: true,
        uploaded_by: userData.user?.id,
      }).select().single();
      if (error) throw error;
      // Update plan active revision
      await supabase.from('qa_project_plans').update({ active_revision_id: data.id }).eq('id', planId);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['qa-plan-revisions', vars.planId] });
      qc.invalidateQueries({ queryKey: ['qa-plans'] });
      toast({ title: 'Plan revision uploaded' });
    },
  });
}
