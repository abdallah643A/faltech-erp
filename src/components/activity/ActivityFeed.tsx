import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Phone, Mail, Calendar, FileText, CheckCircle, MessageSquare, Loader2, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { formatDateTime } from '@/lib/datetime';

const TYPE_ICONS: Record<string, LucideIcon> = {
  call: Phone, email: Mail, meeting: Calendar, task: CheckCircle, note: FileText, whatsapp: MessageSquare,
};

interface ActivityFeedProps {
  /** Filter activities by entity. e.g. {column: 'sales_order_id', value: '...'} */
  filter?: { column: string; value: string };
  limit?: number;
  title?: string;
  className?: string;
}

/**
 * Reusable, audit-friendly activity feed for any entity detail page.
 * Reads from public.activities and renders timezone-aware entries.
 */
export function ActivityFeed({ filter, limit = 25, title = 'Activity', className }: ActivityFeedProps) {
  const { prefs } = useUserPreferences();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activity-feed', filter?.column, filter?.value, limit],
    queryFn: async () => {
      const builder: any = supabase.from('activities');
      let q = builder
        .select('id, type, subject, description, status, created_at, created_by')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (filter) q = q.eq(filter.column, filter.value);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Array<{ id: string; type: string; subject: string; description: string | null; status: string | null; created_at: string }>;
    },
  });

  return (
    <section className={cn('enterprise-card', className)} aria-label={title}>
      <div className="enterprise-card-header">
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <div className="divide-y divide-border">
        {isLoading ? (
          <div className="p-6 flex justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : activities.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">No activity yet</p>
        ) : (
          activities.map((a) => {
            const Icon = TYPE_ICONS[a.type] || FileText;
            const done = a.status === 'completed';
            return (
              <div key={a.id} className="p-3 flex items-start gap-3">
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                  done ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                )} aria-hidden="true">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.subject}</p>
                  {a.description && <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>}
                  <p className="text-[11px] text-muted-foreground mt-0.5" title={formatDateTime(a.created_at, { timezone: prefs?.timezone })}>
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
