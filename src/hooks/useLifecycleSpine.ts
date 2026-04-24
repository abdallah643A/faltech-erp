import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type LifecycleStage = {
  id: string;
  stage_code: string;
  stage_name: string;
  stage_name_ar: string | null;
  display_order: number;
  color_hex: string | null;
  description: string | null;
};

export type LifecycleEvent = {
  id: string;
  company_id: string | null;
  asset_id: string | null;
  equipment_id: string | null;
  stage_code: string;
  event_type: string;
  event_date: string;
  title: string;
  description: string | null;
  status: string;
  source_table: string | null;
  source_record_id: string | null;
  financial_impact: number | null;
  currency: string | null;
  actor_user_id: string | null;
  actor_name: string | null;
  metadata: any;
  created_at: string;
  created_by: string | null;
};

export const useLifecycleStages = () =>
  useQuery({
    queryKey: ['asset-lifecycle-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_lifecycle_stages' as any)
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return (data || []) as unknown as LifecycleStage[];
    },
    staleTime: 60 * 60 * 1000,
  });

export const useAssetLifecycleEvents = (params: { assetId?: string; equipmentId?: string }) =>
  useQuery({
    queryKey: ['asset-lifecycle-events', params],
    queryFn: async () => {
      if (!params.assetId && !params.equipmentId) return [];
      let q = supabase.from('asset_lifecycle_events' as any).select('*');
      if (params.assetId) q = q.eq('asset_id', params.assetId);
      if (params.equipmentId) q = q.eq('equipment_id', params.equipmentId);
      const { data, error } = await q.order('event_date', { ascending: false }).limit(500);
      if (error) throw error;
      return (data || []) as unknown as LifecycleEvent[];
    },
    enabled: !!(params.assetId || params.equipmentId),
  });

export const useCompanyLifecycleEvents = (limit = 100) => {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: ['company-lifecycle-events', activeCompanyId, limit],
    queryFn: async () => {
      let q = supabase.from('asset_lifecycle_events' as any).select('*');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q.order('event_date', { ascending: false }).limit(limit);
      if (error) throw error;
      return (data || []) as unknown as LifecycleEvent[];
    },
  });
};

export const useLogLifecycleEvent = () => {
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (event: Partial<LifecycleEvent> & { stage_code: string; event_type: string; title: string }) => {
      const { data, error } = await supabase
        .from('asset_lifecycle_events' as any)
        .insert({
          company_id: activeCompanyId,
          actor_user_id: user?.id,
          created_by: user?.id,
          ...event,
        } as any)
        .select()
        .single();
      if (error) throw error;
      if (event.equipment_id) {
        await supabase
          .from('cpms_equipment' as any)
          .update({ current_lifecycle_stage: event.stage_code, lifecycle_last_event_at: new Date().toISOString() } as any)
          .eq('id', event.equipment_id);
      }
      if (event.asset_id) {
        await supabase
          .from('assets' as any)
          .update({ current_lifecycle_stage: event.stage_code, lifecycle_last_event_at: new Date().toISOString() } as any)
          .eq('id', event.asset_id);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-lifecycle-events'] });
      qc.invalidateQueries({ queryKey: ['company-lifecycle-events'] });
      toast({ title: 'Lifecycle event logged' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
};
