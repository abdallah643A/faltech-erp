import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { toast } from 'sonner';

/**
 * Record Attachments — Module 1 / Enhancement #15
 *
 * Backed by:
 *   - Storage bucket `attachments` (public)
 *   - Table `app_documents` (entity_type, record_id, file_url, file_name, ...)
 *
 * Files are stored at `{entityType}/{recordId}/{timestamp}-{filename}`,
 * keeping objects scoped per record for easy listing / RLS / cleanup.
 */

export interface RecordAttachment {
  id: string;
  entity_type: string;
  record_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  category: string | null;
  description: string | null;
  tags: string[] | null;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  version: number | null;
  created_at: string | null;
  expires_at: string | null;
}

const BUCKET = 'attachments';

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

export function useRecordAttachments(entityType: string, recordId: string) {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const key = ['record-attachments', entityType, recordId];

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_documents')
        .select('*')
        .eq('entity_type', entityType)
        .eq('record_id', recordId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as RecordAttachment[];
    },
    enabled: !!entityType && !!recordId,
  });

  const upload = useMutation({
    mutationFn: async (input: { file: File; category?: string; description?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const safe = sanitizeFileName(input.file.name);
      const path = `${entityType}/${recordId}/${Date.now()}-${safe}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, input.file, {
          cacheControl: '3600',
          upsert: false,
          contentType: input.file.type || undefined,
        });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const { error: insErr } = await supabase.from('app_documents').insert({
        entity_type: entityType,
        record_id: recordId,
        file_name: input.file.name,
        file_url: pub.publicUrl,
        file_size: input.file.size,
        mime_type: input.file.type || null,
        category: input.category ?? null,
        description: input.description ?? null,
        company_id: activeCompanyId ?? null,
        uploaded_by: user.id,
        uploaded_by_name: user.user_metadata?.full_name ?? user.email ?? null,
        version: 1,
      });
      if (insErr) {
        // Best-effort cleanup of orphan storage object
        await supabase.storage.from(BUCKET).remove([path]);
        throw insErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success('File uploaded');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Upload failed'),
  });

  const remove = useMutation({
    mutationFn: async (att: RecordAttachment) => {
      // Derive storage path from public URL
      const marker = `/${BUCKET}/`;
      const idx = att.file_url.indexOf(marker);
      const path = idx >= 0 ? att.file_url.slice(idx + marker.length) : null;
      if (path) {
        await supabase.storage.from(BUCKET).remove([decodeURIComponent(path)]);
      }
      const { error } = await supabase.from('app_documents').delete().eq('id', att.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success('File removed');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not delete file'),
  });

  return {
    attachments,
    isLoading,
    upload: upload.mutate,
    isUploading: upload.isPending,
    remove: remove.mutate,
  };
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
