import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Phone, Mail, Calendar, FileText, CheckCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from 'date-fns';
import type { Activity } from '@/hooks/useActivities';

interface ActivityCalendarViewProps {
  activities: Activity[];
  onActivityClick?: (activity: Activity) => void;
}

const typeIcons: Record<string, React.ElementType> = {
  call: Phone, email: Mail, meeting: Calendar, task: CheckCircle, note: FileText,
};

const typeColors: Record<string, string> = {
  call: 'bg-info/20 text-info border-info/30',
  email: 'bg-primary/20 text-primary border-primary/30',
  meeting: 'bg-warning/20 text-warning border-warning/30',
  task: 'bg-success/20 text-success border-success/30',
  note: 'bg-muted text-muted-foreground border-border',
};

export function ActivityCalendarView({ activities, onActivityClick }: ActivityCalendarViewProps) {
  const { t } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const activityMap = useMemo(() => {
    const map = new Map<string, Activity[]>();
    activities.forEach(a => {
      const dateKey = a.due_date ? format(new Date(a.due_date), 'yyyy-MM-dd') : null;
      if (dateKey) {
        const arr = map.get(dateKey) || [];
        arr.push(a);
        map.set(dateKey, arr);
      }
    });
    return map;
  }, [activities]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="enterprise-card">
      <div className="p-4 flex items-center justify-between border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7">
        {weekDays.map(d => (
          <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground border-b border-border">{d}</div>
        ))}
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const dayActivities = activityMap.get(key) || [];
          const inMonth = isSameMonth(day, currentMonth);
          return (
            <div
              key={key}
              className={cn(
                'min-h-[100px] border-b border-r border-border p-1 transition-colors',
                !inMonth && 'bg-muted/30',
                isToday(day) && 'bg-primary/5'
              )}
            >
              <div className={cn(
                'text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                isToday(day) && 'bg-primary text-primary-foreground',
                !inMonth && 'text-muted-foreground'
              )}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayActivities.slice(0, 3).map(a => {
                  const Icon = typeIcons[a.type] || FileText;
                  return (
                    <button
                      key={a.id}
                      onClick={() => onActivityClick?.(a)}
                      className={cn(
                        'w-full text-left text-[10px] px-1 py-0.5 rounded border truncate flex items-center gap-1',
                        typeColors[a.type] || typeColors.note,
                        a.status === 'completed' && 'opacity-50 line-through'
                      )}
                    >
                      <Icon className="h-2.5 w-2.5 shrink-0" />
                      {a.subject}
                    </button>
                  );
                })}
                {dayActivities.length > 3 && (
                  <p className="text-[10px] text-muted-foreground text-center">+{dayActivities.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
