import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Activity Timeline Aggregator — Module 1 / Enhancement #13
 *
 * Pulls a unified, time-ordered stream of activity for any record from:
 *   - audit_trail        → field-level change history (admin/manager visible)
 *   - app_record_comments → user comments / collaboration notes
 *   - approval_actions   → approval workflow decisions (joined via approval_requests.document_id)
 *
 * Each source is mapped to a normalized `TimelineEvent`. Failures in one
 * stream don't block the others — the drawer still renders what it can.
 */

export type TimelineEventType = 'audit' | 'comment' | 'approval';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  /** ISO timestamp. */
  at: string;
  /** Display name of who acted, if known. */
  actor: string | null;
  /** Headline, e.g. "Updated status", "Approved", "Added comment". */
  title: string;
  /** Body / details (comment text, change summary, approval reason). */
  body?: string | null;
  /** For audit: the changed field names. */
  changedFields?: string[];
  /** For audit: action verb (INSERT/UPDATE/DELETE). */
  action?: string;
  /** For approval: stage name. */
  stage?: string | null;
}

interface UseTimelineParams {
  entityType: string; // e.g. 'purchase_orders', 'ar_invoices'
  recordId: string;
  enabled?: boolean;
}

export function useActivityTimeline({ entityType, recordId, enabled = true }: UseTimelineParams) {
  return useQuery({
    queryKey: ['activity-timeline', entityType, recordId],
    enabled: enabled && !!entityType && !!recordId,
    queryFn: async (): Promise<TimelineEvent[]> => {
      const events: TimelineEvent[] = [];

      // 1. Audit trail
      try {
        const { data: audit } = await supabase
          .from('audit_trail')
          .select('id, action, changed_fields, user_name, user_email, created_at')
          .eq('table_name', entityType)
          .eq('record_id', recordId)
          .order('created_at', { ascending: false })
          .limit(100);
        (audit ?? []).forEach((a: any) => {
          const fields = (a.changed_fields ?? []).join(', ');
          events.push({
            id: `audit-${a.id}`,
            type: 'audit',
            at: a.created_at,
            actor: a.user_name ?? a.user_email ?? null,
            title:
              a.action === 'INSERT' ? 'Record created'
              : a.action === 'DELETE' ? 'Record deleted'
              : (fields ? `Updated ${fields}` : 'Updated record'),
            changedFields: a.changed_fields ?? [],
            action: a.action,
          });
        });
      } catch { /* RLS or missing — ignore */ }

      // 2. Comments
      try {
        const { data: comments } = await supabase
          .from('app_record_comments')
          .select('id, comment_text, user_name, created_at, is_internal, is_pinned')
          .eq('entity_type', entityType)
          .eq('record_id', recordId)
          .order('created_at', { ascending: false })
          .limit(100);
        (comments ?? []).forEach((c: any) => {
          events.push({
            id: `comment-${c.id}`,
            type: 'comment',
            at: c.created_at,
            actor: c.user_name ?? null,
            title: c.is_pinned ? 'Pinned comment' : (c.is_internal ? 'Internal note' : 'Comment'),
            body: c.comment_text,
          });
        });
      } catch { /* ignore */ }

      // 3. Approvals — find request(s) for this doc, then their actions.
      try {
        const { data: requests } = await supabase
          .from('approval_requests')
          .select('id')
          .eq('document_type', entityType)
          .eq('document_id', recordId);
        const reqIds = (requests ?? []).map((r: any) => r.id);
        if (reqIds.length) {
          const { data: actions } = await supabase
            .from('approval_actions')
            .select('id, action, comments, acted_by_name, acted_at, stage_name')
            .in('request_id', reqIds)
            .order('acted_at', { ascending: false });
          (actions ?? []).forEach((a: any) => {
            events.push({
              id: `approval-${a.id}`,
              type: 'approval',
              at: a.acted_at,
              actor: a.acted_by_name ?? null,
              title: `${(a.action ?? 'Action').charAt(0).toUpperCase()}${(a.action ?? '').slice(1)}`,
              body: a.comments,
              stage: a.stage_name,
            });
          });
        }
      } catch { /* ignore */ }

      return events.sort((a, b) =>
        new Date(b.at).getTime() - new Date(a.at).getTime()
      );
    },
    staleTime: 30_000,
  });
}
