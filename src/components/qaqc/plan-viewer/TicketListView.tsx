import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, User, Clock, Tag, MessageSquare, Camera } from 'lucide-react';
import { STATUS_COLORS, PRIORITY_COLORS, TICKET_STATUSES } from './types';
import type { QATicket } from './types';
import type { ViewMode } from './QAQCPlanViewer';

interface Props {
  tickets: QATicket[];
  viewMode: ViewMode;
  onSelectTicket: (t: QATicket) => void;
  selectedTicketId: string | null;
  isAr: boolean;
}

export function TicketListView({ tickets, viewMode, onSelectTicket, selectedTicketId, isAr }: Props) {
  if (viewMode === 'kanban') {
    return (
      <ScrollArea className="flex-1">
        <div className="flex gap-3 p-4 min-h-full">
          {TICKET_STATUSES.map(status => {
            const items = tickets.filter(t => t.status === status);
            const color = STATUS_COLORS[status] || '#666';
            return (
              <div key={status} className="min-w-[260px] flex-shrink-0">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs font-medium capitalize">{status.replace('_', ' ')}</span>
                  <Badge variant="secondary" className="text-[9px] ml-auto">{items.length}</Badge>
                </div>
                <div className="space-y-2">
                  {items.map(t => (
                    <Card
                      key={t.id}
                      className={`cursor-pointer hover:shadow-md transition-shadow ${t.id === selectedTicketId ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => onSelectTicket(t)}
                    >
                      <CardContent className="p-3 space-y-2">
                        <p className="text-[10px] font-mono text-muted-foreground">{t.ticket_number}</p>
                        <p className="text-xs font-medium leading-tight line-clamp-2">{t.title}</p>
                        <div className="flex items-center gap-1">
                          <Badge className="text-[9px] px-1" style={{ backgroundColor: (PRIORITY_COLORS[t.priority] || '#666') + '20', color: PRIORITY_COLORS[t.priority] }}>{t.priority}</Badge>
                          <Badge variant="outline" className="text-[9px] px-1 capitalize">{t.ticket_type.replace('_', ' ')}</Badge>
                        </div>
                        {t.assignee_name && <p className="text-[10px] text-muted-foreground">{t.assignee_name}</p>}
                      </CardContent>
                    </Card>
                  ))}
                  {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No tickets</p>}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  }

  // List view
  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-2">
        {tickets.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{isAr ? 'لا توجد تذاكر' : 'No tickets found'}</p>
          </div>
        )}
        {tickets.map(t => {
          const statusColor = STATUS_COLORS[t.status] || '#666';
          const priorityColor = PRIORITY_COLORS[t.priority] || '#666';
          return (
            <Card
              key={t.id}
              className={`cursor-pointer hover:shadow-md transition-all ${t.id === selectedTicketId ? 'ring-2 ring-primary' : ''}`}
              onClick={() => onSelectTicket(t)}
            >
              <CardContent className="p-3 flex items-start gap-3">
                <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: statusColor }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono text-muted-foreground">{t.ticket_number}</p>
                      <p className="text-sm font-medium leading-tight">{t.title}</p>
                    </div>
                    <Badge className="text-[9px] shrink-0" style={{ backgroundColor: priorityColor + '20', color: priorityColor }}>{t.priority}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                    <Badge variant="outline" className="text-[9px] capitalize">{t.ticket_type.replace('_', ' ')}</Badge>
                    <Badge className="text-[9px]" style={{ backgroundColor: statusColor + '20', color: statusColor }}>{t.status.replace('_', ' ')}</Badge>
                    {t.building && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{t.building}/{t.floor}</span>}
                    {t.assignee_name && <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5" />{t.assignee_name}</span>}
                    {t.due_date && <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{t.due_date}</span>}
                    {t.trade && <span className="flex items-center gap-0.5"><Tag className="h-2.5 w-2.5 capitalize" />{t.trade}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
