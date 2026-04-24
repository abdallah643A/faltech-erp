import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cake, CalendarHeart, Award } from 'lucide-react';
import { Employee } from '@/hooks/useEmployees';
import { format, differenceInDays, setYear, addDays } from 'date-fns';

interface UpcomingEventsProps {
  employees: Employee[];
}

export function UpcomingEvents({ employees }: UpcomingEventsProps) {
  const events = useMemo(() => {
    const now = new Date();
    const upcoming: { type: 'birthday' | 'anniversary'; employee: Employee; date: Date; daysUntil: number }[] = [];

    employees.forEach(e => {
      // Birthday
      if (e.date_of_birth) {
        const bd = setYear(new Date(e.date_of_birth), now.getFullYear());
        if (bd < now) bd.setFullYear(now.getFullYear() + 1);
        const days = differenceInDays(bd, now);
        if (days <= 30) {
          upcoming.push({ type: 'birthday', employee: e, date: bd, daysUntil: days });
        }
      }

      // Work anniversary
      if (e.hire_date) {
        const hd = setYear(new Date(e.hire_date), now.getFullYear());
        if (hd < now) hd.setFullYear(now.getFullYear() + 1);
        const days = differenceInDays(hd, now);
        if (days <= 30) {
          const years = now.getFullYear() - new Date(e.hire_date).getFullYear();
          upcoming.push({ type: 'anniversary', employee: e, date: hd, daysUntil: days });
        }
      }
    });

    return upcoming.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 10);
  }, [employees]);

  if (events.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarHeart className="h-4 w-4 text-primary" />
          Upcoming Celebrations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {events.map((event, i) => (
          <div key={`${event.employee.id}-${event.type}-${i}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${event.type === 'birthday' ? 'bg-pink-100' : 'bg-blue-100'}`}>
              {event.type === 'birthday' ? <Cake className="h-4 w-4 text-pink-600" /> : <Award className="h-4 w-4 text-blue-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">{event.employee.first_name} {event.employee.last_name}</p>
              <p className="text-[10px] text-muted-foreground">
                {event.type === 'birthday' ? 'Birthday' : 'Work Anniversary'} • {format(event.date, 'MMM d')}
              </p>
            </div>
            <Badge variant={event.daysUntil === 0 ? 'default' : event.daysUntil <= 3 ? 'secondary' : 'outline'} className="text-[10px]">
              {event.daysUntil === 0 ? 'Today! 🎉' : `${event.daysUntil}d`}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
