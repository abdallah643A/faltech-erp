import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { toast } from '@/hooks/use-toast';

export interface CopilotConversation {
  id: string;
  title: string;
  user_role: string | null;
  mode: string;
  language: string;
  is_pinned: boolean;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
}

export interface CopilotMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources: any[];
  confidence: number | null;
  reasoning_summary: string | null;
  suggested_followups: string[] | null;
  action_type: string | null;
  action_payload: any;
  action_status: string | null;
  created_at: string;
}

export interface CopilotFollowup {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  linked_record_type: string | null;
  linked_record_id: string | null;
  linked_url: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface CopilotPrompt {
  id: string;
  title: string;
  prompt_text: string;
  description: string | null;
  category: string;
  target_role: string | null;
  module: string | null;
  tags: string[] | null;
  usage_count: number;
}

export interface CopilotActionLog {
  id: string;
  action_type: string;
  action_description: string;
  action_payload: any;
  target_table: string | null;
  target_record_id: string | null;
  status: string;
  result: any;
  error_message: string | null;
  confirmed_at: string | null;
  executed_at: string | null;
  created_at: string;
}

const COPILOT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/erp-copilot`;

export function useERPCopilot() {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');

  // Conversations
  const { data: conversations = [], isLoading: convLoading } = useQuery({
    queryKey: ['copilot-conversations', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase.from('copilot_conversations' as any).select('*') as any)
        .eq('user_id', user!.id)
        .order('is_pinned', { ascending: false })
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return data as CopilotConversation[];
    },
    enabled: !!user,
  });

  // Messages for active conversation
  const { data: messages = [], isLoading: msgLoading } = useQuery({
    queryKey: ['copilot-messages', activeConversationId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('copilot_messages' as any).select('*') as any)
        .eq('conversation_id', activeConversationId!)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      return data as CopilotMessage[];
    },
    enabled: !!activeConversationId,
  });

  // Create conversation
  const createConversation = useMutation({
    mutationFn: async (params: { title?: string; userRole?: string; mode?: string; language?: string }) => {
      const { data, error } = await (supabase.from('copilot_conversations' as any).insert({
        user_id: user!.id,
        company_id: activeCompanyId,
        title: params.title || 'New Conversation',
        user_role: params.userRole || null,
        mode: params.mode || 'read',
        language: params.language || 'en',
      } as any).select().single() as any);
      if (error) throw error;
      return data as CopilotConversation;
    },
    onSuccess: (conv) => {
      setActiveConversationId(conv.id);
      queryClient.invalidateQueries({ queryKey: ['copilot-conversations'] });
    },
  });

  // Send message with streaming
  const sendMessage = useCallback(async (
    content: string,
    conversationId: string,
    allMessages: CopilotMessage[],
    userRole: string = 'General User',
    mode: string = 'read',
    language: string = 'en'
  ) => {
    if (!user) return;
    setIsStreaming(true);
    setStreamContent('');

    // Save user message locally first
    const userMsg: CopilotMessage = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: 'user',
      content,
      sources: [],
      confidence: null,
      reasoning_summary: null,
      suggested_followups: null,
      action_type: null,
      action_payload: null,
      action_status: null,
      created_at: new Date().toISOString(),
    };

    // Save to DB
    await (supabase.from('copilot_messages' as any).insert({
      conversation_id: conversationId,
      role: 'user',
      content,
    } as any) as any);

    // Update conversation
    await (supabase.from('copilot_conversations' as any).update({
      last_message_at: new Date().toISOString(),
      message_count: allMessages.length + 1,
    } as any).eq('id', conversationId) as any);

    const chatMessages = [
      ...allMessages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content },
    ];

    let accumulated = '';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(COPILOT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: chatMessages,
          conversationId,
          companyId: activeCompanyId,
          userRole,
          mode,
          language,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 429) toast({ title: 'Rate Limited', description: 'Too many requests. Please wait.', variant: 'destructive' });
        if (resp.status === 402) toast({ title: 'Credits Exhausted', description: 'Please add AI credits.', variant: 'destructive' });
        throw new Error(err.error || `Failed (${resp.status})`);
      }

      if (!resp.body) throw new Error('No response stream');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              accumulated += c;
              setStreamContent(accumulated);
            }
          } catch { /* partial */ }
        }
      }

      // Save assistant message to DB
      await (supabase.from('copilot_messages' as any).insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: accumulated,
        model_used: 'google/gemini-3-flash-preview',
      } as any) as any);

      queryClient.invalidateQueries({ queryKey: ['copilot-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['copilot-conversations'] });

    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error';
      toast({ title: 'Copilot Error', description: msg, variant: 'destructive' });
    } finally {
      setIsStreaming(false);
      setStreamContent('');
    }
  }, [user, activeCompanyId, queryClient]);

  // Follow-ups
  const { data: followups = [] } = useQuery({
    queryKey: ['copilot-followups', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase.from('copilot_followups' as any).select('*') as any)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as CopilotFollowup[];
    },
    enabled: !!user,
  });

  // Prompt library
  const { data: prompts = [] } = useQuery({
    queryKey: ['copilot-prompts'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('copilot_prompt_library' as any).select('*') as any)
        .eq('is_active', true)
        .order('usage_count', { ascending: false });
      if (error) throw error;
      return data as CopilotPrompt[];
    },
  });

  // Action log
  const { data: actionLog = [] } = useQuery({
    queryKey: ['copilot-action-log', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase.from('copilot_action_log' as any).select('*') as any)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as CopilotActionLog[];
    },
    enabled: !!user,
  });

  // Create follow-up
  const createFollowup = useMutation({
    mutationFn: async (params: Partial<CopilotFollowup> & { title: string }) => {
      const { error } = await (supabase.from('copilot_followups' as any).insert({
        user_id: user!.id,
        company_id: activeCompanyId,
        ...params,
      } as any) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copilot-followups'] });
      toast({ title: 'Follow-up Created' });
    },
  });

  // Update follow-up status
  const updateFollowup = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'completed') updates.completed_at = new Date().toISOString();
      const { error } = await (supabase.from('copilot_followups' as any).update(updates).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['copilot-followups'] }),
  });

  // Log action
  const logAction = useMutation({
    mutationFn: async (params: { action_type: string; action_description: string; action_payload?: any; conversationId?: string; messageId?: string }) => {
      const { error } = await (supabase.from('copilot_action_log' as any).insert({
        user_id: user!.id,
        company_id: activeCompanyId,
        conversation_id: params.conversationId,
        message_id: params.messageId,
        action_type: params.action_type,
        action_description: params.action_description,
        action_payload: params.action_payload,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      } as any) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['copilot-action-log'] }),
  });

  // Delete conversation
  const deleteConversation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('copilot_conversations' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setActiveConversationId(null);
      queryClient.invalidateQueries({ queryKey: ['copilot-conversations'] });
    },
  });

  return {
    conversations,
    convLoading,
    messages,
    msgLoading,
    activeConversationId,
    setActiveConversationId,
    isStreaming,
    streamContent,
    sendMessage,
    createConversation,
    followups,
    prompts,
    actionLog,
    createFollowup,
    updateFollowup,
    logAction,
    deleteConversation,
  };
}
