import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Detects approval requests whose due_at has passed and marks sla_breached + escalates.
 * Idempotent — only flips rows that aren't already breached.
 */
export function useEscalateOverdueApprovals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const nowIso = new Date().toISOString();
      const { data: overdue, error: selErr } = await (supabase.from('approval_requests' as any)
        .select('id, escalated_count')
        .lt('due_at', nowIso)
        .eq('status', 'pending')
        .or('sla_breached.is.false,sla_breached.is.null') as any);
      if (selErr) throw selErr;
      if (!overdue?.length) return { escalated: 0 };

      const updates = await Promise.all(
        (overdue as any[]).map((r) =>
          (supabase.from('approval_requests' as any).update({
            sla_breached: true,
            escalated_count: (r.escalated_count || 0) + 1,
            last_escalated_at: nowIso,
          }).eq('id', r.id) as any)
        )
      );
      const failed = updates.filter((u: any) => u.error);
      if (failed.length) throw new Error(`${failed.length} updates failed`);
      return { escalated: overdue.length };
    },
    onSuccess: ({ escalated }) => {
      qc.invalidateQueries({ queryKey: ['approval-requests'] });
      if (escalated > 0) toast.success(`Escalated ${escalated} overdue request(s)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useOverdueApprovals() {
  return useQuery({
    queryKey: ['approval-requests-overdue'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('approval_requests' as any)
        .select('*')
        .or('sla_breached.eq.true,due_at.lt.' + new Date().toISOString())
        .eq('status', 'pending')
        .order('due_at', { ascending: true }) as any);
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 60000,
  });
}
