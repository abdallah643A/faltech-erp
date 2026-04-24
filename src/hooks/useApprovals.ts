import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useApprovalTemplates() {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const query = useQuery({
    queryKey: ['approval-templates', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('approval_templates' as any).select('*').order('created_at', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (t: any) => {
      const { data, error } = await (supabase.from('approval_templates' as any).insert({ ...t, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['approval-templates'] }); toast.success('Template created'); },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...rest }: any) => {
      const { error } = await (supabase.from('approval_templates' as any).update(rest).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['approval-templates'] }); toast.success('Template updated'); },
  });

  return { ...query, create, update };
}

export function useApprovalStages(templateId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['approval-stages', templateId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('approval_stages' as any).select('*').eq('template_id', templateId).order('stage_order') as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!templateId,
  });

  const upsert = useMutation({
    mutationFn: async (stage: any) => {
      const { data, error } = await (supabase.from('approval_stages' as any).upsert(stage).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approval-stages'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('approval_stages' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approval-stages'] }),
  });

  return { ...query, upsert, remove };
}

export function useApprovalRequests(documentType?: string, status?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['approval-requests', documentType, status],
    queryFn: async () => {
      let q = (supabase.from('approval_requests' as any).select('*') as any);
      if (documentType) q = q.eq('document_type', documentType);
      if (status) q = q.eq('status', status);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const approve = useMutation({
    mutationFn: async ({ requestId, comments, delegatedFromUserId, delegationId }: { requestId: string; comments?: string; delegatedFromUserId?: string; delegationId?: string }) => {
      const { data: req } = await (supabase.from('approval_requests' as any).select('*').eq('id', requestId).single() as any);
      if (!req) throw new Error('Request not found');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      await (supabase.from('approval_actions' as any).insert({
        request_id: requestId,
        stage_order: req.current_stage,
        action: 'approved',
        acted_by: user?.id,
        acted_by_name: user?.email,
        comments,
        delegated_from_user_id: delegatedFromUserId ?? null,
        delegation_id: delegationId ?? null,
      }) as any);
      
      if (req.current_stage >= req.total_stages) {
        await (supabase.from('approval_requests' as any).update({
          status: 'approved', final_approved_at: new Date().toISOString(), final_approved_by: user?.id,
        }).eq('id', requestId) as any);
      } else {
        await (supabase.from('approval_requests' as any).update({
          current_stage: req.current_stage + 1,
        }).eq('id', requestId) as any);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['approval-requests'] }); toast.success('Approved'); },
  });

  const reject = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: req } = await (supabase.from('approval_requests' as any).select('*').eq('id', requestId).single() as any);
      
      await (supabase.from('approval_actions' as any).insert({
        request_id: requestId, stage_order: req?.current_stage || 1, action: 'rejected',
        acted_by: user?.id, acted_by_name: user?.email, comments: reason,
      }) as any);
      
      await (supabase.from('approval_requests' as any).update({
        status: 'rejected', rejected_at: new Date().toISOString(), rejected_by: user?.id, rejection_reason: reason,
      }).eq('id', requestId) as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['approval-requests'] }); toast.success('Rejected'); },
  });

  return { ...query, approve, reject };
}

export function useApprovalActions(requestId?: string) {
  return useQuery({
    queryKey: ['approval-actions', requestId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('approval_actions' as any).select('*').eq('request_id', requestId).order('acted_at') as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!requestId,
  });
}
