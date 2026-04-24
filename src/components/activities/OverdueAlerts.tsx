import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, Phone, Mail, Calendar, FileText, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import type { Activity } from '@/hooks/useActivities';

interface OverdueAlertsProps {
  activities: Activity[];
  onComplete?: (id: string) => void;
  onEdit?: (activity: Activity) => void;
}

const typeIcons: Record<string, React.ElementType> = {
  call: Phone, email: Mail, meeting: Calendar, task: CheckCircle, note: FileText,
};

export function OverdueAlerts({ activities, onComplete, onEdit }: OverdueAlertsProps) {
  const overdue = useMemo(() => {
    const now = new Date();
    return activities
      .filter(a => a.status === 'pending' && a.due_date && new Date(a.due_date) < now)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  }, [activities]);

  if (overdue.length === 0) {
    return (
      <div className="enterprise-card p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle className="h-5 w-5 text-success" />
        </div>
        <div>
          <p className="font-medium text-success">All caught up!</p>
          <p className="text-sm text-muted-foreground">No overdue activities</p>
        </div>
      </div>
    );
  }

  return (
    <div className="enterprise-card">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h3 className="text-lg font-semibold">Overdue Activities</h3>
        <Badge className="bg-destructive text-destructive-foreground">{overdue.length}</Badge>
      </div>
      <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
        {overdue.map(activity => {
          const Icon = typeIcons[activity.type] || FileText;
          const overdueDuration = formatDistanceToNow(new Date(activity.due_date!), { addSuffix: false });
          return (
            <div key={activity.id} className="p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
              <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{activity.subject}</p>
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <Clock className="h-3 w-3" />
                  <span>Overdue by {overdueDuration}</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {onEdit && (
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onEdit(activity)}>
                    Edit
                  </Button>
                )}
                {onComplete && (
                  <Button variant="outline" size="sm" className="text-xs h-7 text-success border-success/30" onClick={() => onComplete(activity.id)}>
                    Complete
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
