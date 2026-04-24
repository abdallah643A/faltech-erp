import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePortalTimeline } from '@/hooks/useUnifiedPortal';
import { format } from 'date-fns';
import { Activity } from 'lucide-react';

interface Props {
  entityType: string;
  entityId: string;
  title?: string;
}

export function PortalTimeline({ entityType, entityId, title = 'Collaboration Timeline' }: Props) {
  const { data: events = [], isLoading } = usePortalTimeline(entityType, entityId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ol className="relative border-l border-border ml-2 space-y-4">
            {events.map((e) => (
              <li key={e.id} className="ml-4">
                <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary" />
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{e.event_type}</Badge>
                  <span className="text-sm font-medium">{e.event_label || e.event_type}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(e.created_at), 'PPpp')} · {e.portal_type}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
