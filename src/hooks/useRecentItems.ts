import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Recently Viewed Records — Module 1 / Enhancement #8
 *
 * Backed by `app_user_recent_items`. Each visit to a record page calls
 * `useTrackRecent({...})` which upserts a row (incrementing access_count
 * and bumping last_accessed_at). The topbar tray reads the latest N rows
 * to let users jump back to in-flight work across modules.
 */

export interface RecentItem {
  id: string;
  user_id: string;
  entity_type: string;
  record_id: string;
  record_title: string;
  record_subtitle: string | null;
  record_path: string | null;
  access_count: number | null;
  last_accessed_at: string | null;
}

export interface RecentInput {
  entity_type: string;
  record_id: string;
  record_title: string;
  record_subtitle?: string;
  record_path?: string;
}

const RECENT_LIMIT = 25;

export function useRecentItems(limit = RECENT_LIMIT) {
  const { user } = useAuth();
  const key = ['recent-items', user?.id, limit];

  const { data: items = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_user_recent_items')
        .select('*')
        .order('last_accessed_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as RecentItem[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  return { items, isLoading };
}

export function useClearRecents() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('app_user_recent_items')
        .delete()
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recent-items', user?.id] }),
  });
}

/**
 * Hook: log a record visit. Mount on any record-detail page.
 *
 * Example:
 *   useTrackRecent({
 *     entity_type: 'purchase_order',
 *     record_id: po.id,
 *     record_title: `PO-${po.doc_num}`,
 *     record_subtitle: po.vendor_name,
 *     record_path: `/purchase-orders/${po.id}`,
 *   });
 */
export function useTrackRecent(input: RecentInput | null | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const enabled = !!user && !!input?.record_id && !!input?.entity_type;
  // Stable dep key — refire only when target record changes
  const depKey = enabled ? `${input!.entity_type}:${input!.record_id}` : '';

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      // Try update existing row first to bump access_count atomically.
      const { data: existing } = await supabase
        .from('app_user_recent_items')
        .select('id, access_count')
        .eq('user_id', user!.id)
        .eq('entity_type', input!.entity_type)
        .eq('record_id', input!.record_id)
        .maybeSingle();

      if (cancelled) return;

      if (existing) {
        await supabase
          .from('app_user_recent_items')
          .update({
            last_accessed_at: new Date().toISOString(),
            access_count: (existing.access_count ?? 0) + 1,
            record_title: input!.record_title,
            record_subtitle: input!.record_subtitle ?? null,
            record_path: input!.record_path ?? null,
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('app_user_recent_items').insert({
          user_id: user!.id,
          entity_type: input!.entity_type,
          record_id: input!.record_id,
          record_title: input!.record_title,
          record_subtitle: input!.record_subtitle ?? null,
          record_path: input!.record_path ?? null,
          access_count: 1,
          last_accessed_at: new Date().toISOString(),
        });
      }

      qc.invalidateQueries({ queryKey: ['recent-items', user!.id] });
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);
}
