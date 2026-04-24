import { cn } from '@/lib/utils';
import { Phone, Mail, Calendar, FileText, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format } from 'date-fns';
import type { Activity } from '@/hooks/useActivities';

interface ActivityTimelineProps {
  activities: Activity[];
  maxItems?: number;
}

const typeIcons: Record<string, React.ElementType> = {
  call: Phone, email: Mail, meeting: Calendar, task: CheckCircle, note: FileText,
};

const typeColors: Record<string, string> = {
  call: 'bg-info text-info-foreground',
  email: 'bg-primary text-primary-foreground',
  meeting: 'bg-warning text-warning-foreground',
  task: 'bg-success text-success-foreground',
  note: 'bg-muted-foreground text-background',
};

const statusBg: Record<string, string> = {
  pending: 'bg-info/10 text-info',
  completed: 'bg-success/10 text-success',
  cancelled: 'bg-muted text-muted-foreground',
};

export function ActivityTimeline({ activities, maxItems = 20 }: ActivityTimelineProps) {
  const sorted = [...activities]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, maxItems);

  if (sorted.length === 0) {
    return (
      <div className="enterprise-card p-6 text-center text-muted-foreground">
        No activities to display
      </div>
    );
  }

  return (
    <div className="enterprise-card p-4">
      <h3 className="text-lg font-semibold mb-4">Activity Timeline</h3>
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
        <div className="space-y-4">
          {sorted.map((activity, i) => {
            const Icon = typeIcons[activity.type] || FileText;
            return (
              <div key={activity.id} className="relative flex items-start gap-4 pl-2">
                <div className={cn(
                  'relative z-10 h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                  typeColors[activity.type] || typeColors.note
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{activity.subject}</span>
                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', statusBg[activity.status || 'pending'])}>
                      {activity.status}
                    </Badge>
                    {activity.priority === 'high' && (
                      <Badge className="bg-destructive/10 text-destructive text-[10px] px-1.5 py-0">High</Badge>
                    )}
                  </div>
                  {activity.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{activity.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                    <span className="capitalize">{activity.type}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}</span>
                    {activity.due_date && (
                      <>
                        <span>•</span>
                        <span>Due: {format(new Date(activity.due_date), 'MMM d, yyyy')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
