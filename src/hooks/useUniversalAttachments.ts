import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AppDocument {
  id: string;
  entity_type: string;
  record_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  category: string;
  tags: string[];
  description: string | null;
  version: number;
  parent_document_id: string | null;
  expires_at: string | null;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  company_id: string | null;
  created_at: string;
}

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
}

export function useAttachments(entityType: string, recordId: string) {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const qk = ['attachments', entityType, recordId];

  const { data: documents = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const { data } = await supabase
        .from('app_documents')
        .select('*')
        .eq('entity_type', entityType)
        .eq('record_id', recordId)
        .order('created_at', { ascending: false });
      return (data || []) as AppDocument[];
    },
    enabled: !!entityType && !!recordId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split('.').pop();
      const path = `${entityType}/${recordId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('attachments').upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(path);
      const { error: dbErr } = await supabase.from('app_documents').insert({
        entity_type: entityType,
        record_id: recordId,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user?.id,
        uploaded_by_name: profile?.full_name || profile?.email,
      });
      if (dbErr) throw dbErr;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      await supabase.from('app_documents').delete().eq('id', docId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  return { documents, isLoading, upload: uploadMutation.mutate, isUploading: uploadMutation.isPending, deleteDoc: deleteMutation.mutate };
}

export function useRecordComments(entityType: string, recordId: string) {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const qk = ['comments', entityType, recordId];

  const { data: comments = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const { data } = await supabase
        .from('app_record_comments')
        .select('*')
        .eq('entity_type', entityType)
        .eq('record_id', recordId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      return (data || []) as RecordComment[];
    },
    enabled: !!entityType && !!recordId,
  });

  const addComment = useMutation({
    mutationFn: async (text: string) => {
      await supabase.from('app_record_comments').insert({
        entity_type: entityType,
        record_id: recordId,
        comment_text: text,
        user_id: user?.id!,
        user_name: profile?.full_name || profile?.email,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      await supabase.from('app_record_comments').update({ is_pinned: !pinned }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('app_record_comments').delete().eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  return {
    comments, isLoading,
    addComment: addComment.mutate,
    togglePin: togglePin.mutate,
    deleteComment: deleteComment.mutate,
    isAdding: addComment.isPending,
  };
}
