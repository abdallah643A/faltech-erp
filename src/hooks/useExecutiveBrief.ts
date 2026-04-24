import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * useExecutiveBrief
 * --------------------------------
 * Reads today's snapshot from `executive_brief_snapshots`, plus the user's
 * subscription preferences. Background generation is handled by the
 * `executive-brief-dispatch` edge function, scheduled daily at 07:00 KSA.
 *
 * Provides a `refresh()` action that calls `compute_executive_brief` on
 * demand (e.g., when an exec opens the dashboard before the cron fires).
 */
export function useExecutiveBrief() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const qc = useQueryClient();

  const snapshot = useQuery({
    queryKey: ['executive-brief', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('executive_brief_snapshots' as any)
        .select('*')
        .eq('company_id', activeCompanyId!)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const subscription = useQuery({
    queryKey: ['executive-brief-sub', activeCompanyId, user?.id],
    enabled: !!activeCompanyId && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('executive_brief_subscriptions' as any)
        .select('*')
        .eq('company_id', activeCompanyId!)
        .eq('user_id', user!.id)
        .maybeSingle();
      return data as any;
    },
  });

  const refresh = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc(
        'compute_executive_brief' as any,
        { p_company_id: activeCompanyId } as any
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['executive-brief', activeCompanyId] });
      toast.success('Brief refreshed');
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to refresh'),
  });

  const upsertSubscription = useMutation({
    mutationFn: async (vals: { email: string; channel_email: boolean; channel_inapp: boolean; is_active: boolean }) => {
      if (!user?.id || !activeCompanyId) throw new Error('Not ready');
      const { error } = await supabase.from('executive_brief_subscriptions' as any).upsert({
        user_id: user.id,
        company_id: activeCompanyId,
        ...vals,
      } as any, { onConflict: 'user_id,company_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['executive-brief-sub', activeCompanyId, user?.id] });
      toast.success('Preferences saved');
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to save'),
  });

  return { snapshot, subscription, refresh, upsertSubscription };
}
