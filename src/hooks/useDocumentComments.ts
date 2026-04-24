import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DocumentComment {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  document_type: string;
  document_id: string;
  content: string;
  mentions: string[];
  parent_id: string | null;
  attachments: any[];
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export function useDocumentComments(documentType: string, documentId: string) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const key = ['document-comments', documentType, documentId];

  const { data: comments = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_comments')
        .select('*')
        .eq('document_type', documentType)
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as DocumentComment[];
    },
    enabled: !!documentType && !!documentId,
  });

  const addComment = useMutation({
    mutationFn: async (input: { content: string; mentions?: string[]; parent_id?: string }) => {
      const { error } = await supabase.from('document_comments').insert({
        user_id: user!.id,
        user_name: profile?.full_name || null,
        user_email: profile?.email || null,
        document_type: documentType,
        document_id: documentId,
        content: input.content,
        mentions: input.mentions || [],
        parent_id: input.parent_id || null,
      });
      if (error) throw error;

      // Create notifications for mentioned users
      if (input.mentions?.length) {
        const notifications = input.mentions.map(uid => ({
          user_id: uid,
          phase: 'mention',
          title: `${profile?.full_name || 'Someone'} mentioned you`,
          message: input.content.slice(0, 100),
          notification_type: 'workflow',
          link_url: `/${documentType}/${documentId}`,
        }));
        await supabase.from('workflow_notifications').insert(notifications);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const editComment = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from('document_comments')
        .update({ content, is_edited: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('document_comments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { comments, isLoading, addComment, editComment, deleteComment };
}
