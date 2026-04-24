import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useApprovalDelegations(userId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['approval-delegations', userId],
    queryFn: async () => {
      let q = (supabase.from('approval_delegations' as any).select('*').order('created_at', { ascending: false }) as any);
      if (userId) q = q.eq('delegator_user_id', userId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (d: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...d, delegator_user_id: d.delegator_user_id || user?.id };
      const { data, error } = await (supabase.from('approval_delegations' as any).insert(payload).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['approval-delegations'] }); toast.success('Delegation created'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...rest }: any) => {
      const { error } = await (supabase.from('approval_delegations' as any).update(rest).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['approval-delegations'] }); toast.success('Delegation updated'); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('approval_delegations' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['approval-delegations'] }); toast.success('Delegation removed'); },
  });

  return { ...query, create, update, remove };
}

export async function resolveEffectiveApprover(originalUserId: string, documentType?: string, templateId?: string) {
  const { data, error } = await (supabase.rpc as any)('resolve_effective_approver', {
    _original_user: originalUserId,
    _document_type: documentType ?? null,
    _template_id: templateId ?? null,
  });
  if (error) throw error;
  return data as string;
}
