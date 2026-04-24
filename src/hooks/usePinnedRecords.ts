import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Pinned Records — Module 1 / Enhancement #7
 *
 * Backed by the existing `app_user_favorites` table. Each row is a pinned
 * pointer to any record in the system (PO, invoice, project, employee, …)
 * with enough metadata (title, subtitle, path) to render a one-click jump
 * link in the topbar tray, without re-fetching the source row.
 */

export interface PinnedRecord {
  id: string;
  user_id: string;
  entity_type: string;
  record_id: string;
  record_title: string;
  record_subtitle: string | null;
  record_path: string | null;
  category: string | null;
  created_at: string | null;
}

export interface PinInput {
  entity_type: string;          // 'purchase_order' | 'ar_invoice' | 'project' | 'employee' | …
  record_id: string;            // source row id
  record_title: string;         // e.g. "PO-1234"
  record_subtitle?: string;     // e.g. "ACME Trading · 12,500 SAR"
  record_path?: string;         // route to jump to, e.g. "/purchase-orders/uuid"
  category?: string;            // optional grouping label, e.g. "Procurement"
}

export function usePinnedRecords() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ['pinned-records', user?.id];

  const { data: pins = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_user_favorites')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PinnedRecord[];
    },
    enabled: !!user,
  });

  const pin = useMutation({
    mutationFn: async (input: PinInput) => {
      const { error } = await supabase.from('app_user_favorites').insert({
        user_id: user!.id,
        entity_type: input.entity_type,
        record_id: input.record_id,
        record_title: input.record_title,
        record_subtitle: input.record_subtitle ?? null,
        record_path: input.record_path ?? null,
        category: input.category ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success('Pinned to tray');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not pin record'),
  });

  const unpin = useMutation({
    mutationFn: async (input: { entity_type: string; record_id: string }) => {
      const { error } = await supabase
        .from('app_user_favorites')
        .delete()
        .eq('user_id', user!.id)
        .eq('entity_type', input.entity_type)
        .eq('record_id', input.record_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success('Removed from tray');
    },
  });

  const isPinned = (entity_type: string, record_id: string) =>
    pins.some(p => p.entity_type === entity_type && p.record_id === record_id);

  const togglePin = (input: PinInput) => {
    if (isPinned(input.entity_type, input.record_id)) {
      unpin.mutate({ entity_type: input.entity_type, record_id: input.record_id });
    } else {
      pin.mutate(input);
    }
  };

  return { pins, isLoading, pin: pin.mutate, unpin: unpin.mutate, togglePin, isPinned };
}
