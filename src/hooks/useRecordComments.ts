import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Record Comments + @Mentions — Module 1 / Enhancement #14
 *
 * Backed by `app_record_comments`. Mentions are encoded inline as
 * `@[Display Name](user-uuid)` so the stored text remains a single column
 * but can be reliably re-rendered with links and triggers notifications.
 */

export interface RecordComment {
  id: string;
  entity_type: string;
  record_id: string;
  comment_text: string;
  is_pinned: boolean;
  is_internal: boolean;
  user_id: string;
  user_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface MentionableUser {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

const MENTION_RE = /@\[([^\]]+)\]\(([0-9a-f-]{36})\)/g;

export function extractMentions(text: string): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(MENTION_RE.source, 'g');
  while ((m = re.exec(text)) !== null) out.push({ name: m[1], id: m[2] });
  return out;
}

export function useRecordComments(entityType: string, recordId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ['record-comments', entityType, recordId];

  const { data: comments = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_record_comments')
        .select('*')
        .eq('entity_type', entityType)
        .eq('record_id', recordId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as RecordComment[];
    },
    enabled: !!entityType && !!recordId,
  });

  const addComment = useMutation({
    mutationFn: async (input: { text: string; isInternal?: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      const text = input.text.trim();
      if (!text) throw new Error('Comment cannot be empty');

      const { data: row, error } = await supabase
        .from('app_record_comments')
        .insert({
          entity_type: entityType,
          record_id: recordId,
          comment_text: text,
          is_internal: input.isInternal ?? true,
          user_id: user.id,
          user_name: user.user_metadata?.full_name ?? user.email ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      // Fan out @mention notifications
      const mentions = extractMentions(text);
      if (mentions.length) {
        const actor = user.user_metadata?.full_name ?? user.email ?? 'Someone';
        const rows = mentions
          .filter(m => m.id !== user.id) // don't notify self
          .map(m => ({
            user_id: m.id,
            phase: 'comment_mention',
            title: `${actor} mentioned you`,
            message: text.length > 240 ? text.slice(0, 237) + '…' : text,
            notification_type: 'mention',
            severity: 'info',
            link_url: `/${entityType.replace(/_/g, '-')}/${recordId}`,
          }));
        if (rows.length) {
          await supabase.from('workflow_notifications').insert(rows);
        }
      }
      return row as RecordComment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success('Comment posted');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not post comment'),
  });

  const updateComment = useMutation({
    mutationFn: async (input: { id: string; text: string }) => {
      const { error } = await supabase
        .from('app_record_comments')
        .update({ comment_text: input.text, updated_at: new Date().toISOString() })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const togglePin = useMutation({
    mutationFn: async (input: { id: string; is_pinned: boolean }) => {
      const { error } = await supabase
        .from('app_record_comments')
        .update({ is_pinned: !input.is_pinned })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('app_record_comments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success('Comment deleted');
    },
  });

  return {
    comments,
    isLoading,
    addComment: addComment.mutate,
    isPosting: addComment.isPending,
    updateComment: updateComment.mutate,
    togglePin: togglePin.mutate,
    deleteComment: deleteComment.mutate,
  };
}

/** Search profiles for the @mention autocomplete picker. */
export function useMentionableUsers(query: string) {
  return useQuery({
    queryKey: ['mentionable-users', query],
    queryFn: async (): Promise<MentionableUser[]> => {
      const q = query.trim();
      let req = supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .order('full_name', { ascending: true })
        .limit(8);
      if (q) {
        req = req.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
      }
      const { data, error } = await req;
      if (error) throw error;
      return (data ?? []) as MentionableUser[];
    },
    staleTime: 30_000,
  });
}
