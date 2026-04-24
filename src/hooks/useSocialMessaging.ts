import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

// ── Types ───────────────────────────────────────────────────
export interface SocialConversation {
  id: string;
  channel_id: string | null;
  channel_type: string;
  external_conversation_id: string | null;
  social_identity_id: string | null;
  business_partner_id: string | null;
  contact_name: string | null;
  contact_identifier: string | null;
  status: string;
  assigned_to: string | null;
  assigned_team: string | null;
  subject: string | null;
  tags: string[];
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  is_starred: boolean;
  internal_notes: string | null;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialMessage {
  id: string;
  conversation_id: string;
  direction: string;
  sender_type: string;
  sender_name: string | null;
  sender_user_id: string | null;
  message_text: string | null;
  message_type: string;
  attachments: any[];
  template_id: string | null;
  template_variables: any;
  external_message_id: string | null;
  delivery_status: string;
  failure_reason: string | null;
  is_internal_note: boolean;
  metadata: any;
  erp_document_type: string | null;
  erp_document_id: string | null;
  company_id: string | null;
  created_at: string;
}

export interface SocialTemplate {
  id: string;
  template_name: string;
  category: string;
  channel_type: string | null;
  subject: string | null;
  body_text: string;
  variables: any[];
  language: string;
  is_active: boolean;
  approval_status: string;
  company_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SocialCampaign {
  id: string;
  campaign_name: string;
  campaign_type: string;
  channel_type: string;
  channel_id: string | null;
  template_id: string | null;
  custom_message: string | null;
  audience_criteria: any;
  audience_count: number;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  stats_targeted: number;
  stats_sent: number;
  stats_delivered: number;
  stats_failed: number;
  stats_replied: number;
  company_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SocialChannel {
  id: string;
  channel_type: string;
  channel_name: string;
  is_active: boolean;
  is_inbound_enabled: boolean;
  is_outbound_enabled: boolean;
  company_id: string | null;
  created_at: string;
}

// ── Hooks ───────────────────────────────────────────────────
export function useConversations(filters?: { status?: string; channel?: string; assigned?: string }) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['social-conversations', activeCompanyId, filters],
    queryFn: async () => {
      let q = supabase
        .from('social_conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters?.channel && filters.channel !== 'all') q = q.eq('channel_type', filters.channel);
      if (filters?.assigned) q = q.eq('assigned_to', filters.assigned);

      const { data, error } = await q.limit(200);
      if (error) throw error;
      return (data || []) as SocialConversation[];
    },
    refetchInterval: 10000,
  });
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['social-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('social_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as SocialMessage[];
    },
    enabled: !!conversationId,
    refetchInterval: 5000,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  return useMutation({
    mutationFn: async (params: {
      conversationId: string;
      text: string;
      isInternalNote?: boolean;
      templateId?: string;
      erpDocType?: string;
      erpDocId?: string;
    }) => {
      const { error } = await supabase.from('social_messages').insert({
        conversation_id: params.conversationId,
        direction: 'outbound',
        sender_type: 'agent',
        sender_name: profile?.full_name || profile?.email || 'Agent',
        sender_user_id: user?.id,
        message_text: params.text,
        message_type: params.templateId ? 'template' : 'text',
        is_internal_note: params.isInternalNote || false,
        template_id: params.templateId,
        erp_document_type: params.erpDocType,
        erp_document_id: params.erpDocId,
        delivery_status: 'sent',
        company_id: activeCompanyId,
      });
      if (error) throw error;

      // Update conversation
      await supabase.from('social_conversations').update({
        last_message_at: new Date().toISOString(),
        last_message_preview: params.text?.substring(0, 100),
        status: 'open',
      }).eq('id', params.conversationId);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['social-messages', vars.conversationId] });
      qc.invalidateQueries({ queryKey: ['social-conversations'] });
    },
  });
}

export function useUpdateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; updates: Partial<SocialConversation> }) => {
      const { error } = await supabase.from('social_conversations')
        .update(params.updates as any)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-conversations'] }),
  });
}

export function useSocialTemplates() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['social-templates', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('social_templates').select('*').eq('is_active', true).order('template_name');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SocialTemplate[];
    },
  });
}

export function useSocialCampaigns() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['social-campaigns', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('social_campaigns').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SocialCampaign[];
    },
  });
}

export function useSocialChannels() {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['social-channels', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('social_channels').select('*').order('channel_name');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SocialChannel[];
    },
  });
}

export function useRecordLinks(conversationId: string | null) {
  return useQuery({
    queryKey: ['social-record-links', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('social_record_links')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!conversationId,
  });
}

export function useLinkRecord() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: { conversationId: string; recordType: string; recordId: string; recordLabel: string }) => {
      const { error } = await supabase.from('social_record_links').insert({
        conversation_id: params.conversationId,
        record_type: params.recordType,
        record_id: params.recordId,
        record_label: params.recordLabel,
        linked_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['social-record-links', vars.conversationId] }),
  });
}

export function useCustomerContext(businessPartnerId: string | null) {
  return useQuery({
    queryKey: ['social-customer-context', businessPartnerId],
    queryFn: async () => {
      if (!businessPartnerId) return null;
      const { data, error } = await supabase
        .from('business_partners')
        .select('*')
        .eq('id', businessPartnerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!businessPartnerId,
  });
}
