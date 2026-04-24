import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContractManagement } from '@/hooks/useContractManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, AlertTriangle, CheckCircle2, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isSameDay, isPast } from 'date-fns';

export default function RenewalCalendar() {
  const { t } = useLanguage();
  const { contracts, guarantees } = useContractManagement();
  const [month, setMonth] = useState(new Date());
  const [view, setView] = useState<'calendar' | 'list'>('list');

  // Build renewal events
  const events: any[] = [];
  contracts.forEach((c: any) => {
    if (c.end_date) {
      const daysLeft = differenceInDays(new Date(c.end_date), new Date());
      events.push({
        id: c.id, type: 'contract', date: c.end_date,
        title: `${c.contract_number} - ${c.partner_name}`,
        subtitle: c.contract_type, value: c.value, daysLeft,
        urgency: daysLeft < 0 ? 'expired' : daysLeft <= 30 ? 'critical' : daysLeft <= 90 ? 'warning' : 'normal',
        autoRenew: c.auto_renew,
      });
    }
  });
  guarantees.forEach((g: any) => {
    if (g.expiry_date) {
      const daysLeft = differenceInDays(new Date(g.expiry_date), new Date());
      events.push({
        id: g.id, type: 'guarantee', date: g.expiry_date,
        title: g.title, subtitle: g.guarantee_type, value: g.amount, daysLeft,
        urgency: daysLeft < 0 ? 'expired' : daysLeft <= 30 ? 'critical' : daysLeft <= 90 ? 'warning' : 'normal',
      });
    }
  });

  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const urgencyColors: Record<string, string> = {
    expired: 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20',
    critical: 'border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/20',
    warning: 'border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
    normal: 'border-l-4 border-l-green-500',
  };

  const expired = events.filter(e => e.urgency === 'expired');
  const critical = events.filter(e => e.urgency === 'critical');
  const warning = events.filter(e => e.urgency === 'warning');

  // Calendar grid
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Calendar className="h-6 w-6 text-primary" />Renewal Calendar</h1>
          <p className="text-sm text-muted-foreground">Contract and guarantee renewal tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setView('list')}>List</Button>
          <Button variant={view === 'calendar' ? 'default' : 'outline'} size="sm" onClick={() => setView('calendar')}>Calendar</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="border-red-200"><CardContent className="p-3 text-center"><p className="text-xs text-red-600">Expired</p><p className="text-2xl font-bold text-red-600">{expired.length}</p></CardContent></Card>
        <Card className="border-orange-200"><CardContent className="p-3 text-center"><p className="text-xs text-orange-600">Critical (≤30d)</p><p className="text-2xl font-bold text-orange-600">{critical.length}</p></CardContent></Card>
        <Card className="border-yellow-200"><CardContent className="p-3 text-center"><p className="text-xs text-yellow-600">Warning (≤90d)</p><p className="text-2xl font-bold text-yellow-600">{warning.length}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Tracked</p><p className="text-2xl font-bold">{events.length}</p></CardContent></Card>
      </div>

      {view === 'list' ? (
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {sorted.map(event => (
              <Card key={`${event.type}-${event.id}`} className={urgencyColors[event.urgency]}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{event.type === 'contract' ? 'Contract' : 'Guarantee'}</Badge>
                      {event.autoRenew && <Badge className="bg-blue-100 text-blue-800 text-xs">Auto-Renew</Badge>}
                      <span className="font-medium text-sm">{event.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{event.subtitle} — Value: {Number(event.value || 0).toLocaleString()} SAR</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{format(new Date(event.date), 'dd/MM/yyyy')}</p>
                    <p className={`text-xs font-medium ${event.daysLeft < 0 ? 'text-red-600' : event.daysLeft <= 30 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                      {event.daysLeft < 0 ? `${Math.abs(event.daysLeft)}d overdue` : `${event.daysLeft}d remaining`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <CardTitle>{format(month, 'MMMM yyyy')}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="font-medium">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {days.map(day => {
                const dayEvents = events.filter(e => isSameDay(new Date(e.date), day));
                const hasExpired = dayEvents.some(e => e.urgency === 'expired' || e.urgency === 'critical');
                return (
                  <div key={day.toISOString()} className={`min-h-[60px] p-1 border rounded text-xs ${isSameDay(day, new Date()) ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <div className="font-medium">{format(day, 'd')}</div>
                    {dayEvents.slice(0, 2).map((e, i) => (
                      <div key={i} className={`text-[10px] truncate rounded px-1 mt-0.5 ${e.urgency === 'expired' || e.urgency === 'critical' ? 'bg-red-100 text-red-800' : e.urgency === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {e.title.substring(0, 15)}
                      </div>
                    ))}
                    {dayEvents.length > 2 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 2}</div>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
