import { useState, useMemo, useCallback } from 'react';
import { useActivities, Activity, ActivityInput } from '@/hooks/useActivities';
import { useUsers } from '@/hooks/useUsers';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  ChevronLeft, ChevronRight, Plus, Phone, Mail, Users, CheckSquare,
  Clock, Calendar as CalendarIcon, RotateCcw, Video, Loader2,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, addWeeks, subWeeks, startOfDay, addHours } from 'date-fns';

type ViewMode = 'month' | 'week' | 'day';

const typeConfig: Record<string, { color: string; bg: string; border: string; icon: React.ElementType; label: string }> = {
  meeting: { color: 'text-info', bg: 'bg-info/10', border: 'border-info/30', icon: Video, label: 'Meeting' },
  call: { color: 'text-success', bg: 'bg-success/10', border: 'border-success/30', icon: Phone, label: 'Call' },
  task: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30', icon: CheckSquare, label: 'Task' },
  email: { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30', icon: Mail, label: 'Email' },
  note: { color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border', icon: Clock, label: 'Note' },
};

function getEventsForDate(activities: Activity[], date: Date) {
  return activities.filter(a => {
    const d = a.due_date || a.created_at;
    return d && isSameDay(new Date(d), date);
  });
}

function EventBadge({ activity, onClick }: { activity: Activity; onClick: () => void }) {
  const config = typeConfig[activity.type] || typeConfig.note;
  const Icon = config.icon;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate flex items-center gap-1 border ${config.bg} ${config.color} ${config.border} hover:opacity-80 transition-opacity`}
    >
      <Icon className="h-2.5 w-2.5 shrink-0" />
      <span className="truncate">{activity.subject}</span>
    </button>
  );
}

export default function CalendarModule() {
  const { t } = useLanguage();
  const { activities, isLoading, createActivity } = useActivities();
  const { users } = useUsers();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date>(new Date());
  const [newEvent, setNewEvent] = useState<ActivityInput>({
    type: 'meeting', subject: '', description: '', due_date: '', priority: 'medium',
  });

  const navigate = useCallback((dir: number) => {
    if (viewMode === 'month') setCurrentDate(prev => dir > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
    else if (viewMode === 'week') setCurrentDate(prev => dir > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1));
    else setCurrentDate(prev => addDays(prev, dir));
  }, [viewMode]);

  const goToday = () => setCurrentDate(new Date());

  // Month grid
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    const days: Date[] = [];
    let d = start;
    while (d <= end) { days.push(d); d = addDays(d, 1); }
    return days;
  }, [currentDate]);

  // Week days
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  // Hours for day/week view
  const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6am-9pm

  // Upcoming events (next 7 days)
  const upcoming = useMemo(() => {
    const now = new Date();
    const weekLater = addDays(now, 7);
    return activities
      .filter(a => {
        const d = a.due_date ? new Date(a.due_date) : null;
        return d && d >= now && d <= weekLater && a.status !== 'cancelled';
      })
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 10);
  }, [activities]);

  const handleDayClick = (date: Date) => {
    setCreateDate(date);
    setNewEvent({ type: 'meeting', subject: '', description: '', due_date: format(date, "yyyy-MM-dd'T'09:00"), priority: 'medium' });
    setCreateOpen(true);
  };

  const handleEventClick = (activity: Activity) => {
    setSelectedActivity(activity);
    setDetailOpen(true);
  };

  const handleCreate = () => {
    if (!newEvent.subject) return;
    createActivity.mutate(newEvent);
    setCreateOpen(false);
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return 'Unassigned';
    const u = users.find(u => u.user_id === userId);
    return u?.full_name || u?.email || 'Unknown';
  };

  const headerLabel = viewMode === 'month'
    ? format(currentDate, 'MMMM yyyy')
    : viewMode === 'week'
    ? `${format(weekDays[0], 'MMM d')} – ${format(weekDays[6], 'MMM d, yyyy')}`
    : format(currentDate, 'EEEE, MMMM d, yyyy');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-foreground">Calendar</h1>
          <p className="text-xs md:text-sm text-muted-foreground">View and manage all scheduled activities</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => { setCreateDate(new Date()); setNewEvent({ type: 'meeting', subject: '', description: '', due_date: format(new Date(), "yyyy-MM-dd'T'09:00"), priority: 'medium' }); setCreateOpen(true); }}>
            <Plus className="h-3.5 w-3.5" /> New Event
          </Button>
          <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 px-1.5" title="Google Calendar sync (placeholder)"><CalendarIcon className="h-3 w-3" /> Google</span>
            <span className="flex items-center gap-1 px-1.5" title="Outlook Calendar sync (placeholder)"><CalendarIcon className="h-3 w-3" /> Outlook</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Main Calendar */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-sm font-semibold min-w-[180px] text-center">{headerLabel}</h2>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={goToday}>Today</Button>
                </div>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {(['month', 'week', 'day'] as ViewMode[]).map(v => (
                    <Button
                      key={v}
                      variant={viewMode === v ? 'default' : 'ghost'}
                      size="sm"
                      className="rounded-none text-xs px-3 h-7 capitalize"
                      onClick={() => setViewMode(v)}
                    >
                      {v}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {viewMode === 'month' && (
                <div>
                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 mb-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="text-[10px] font-semibold text-muted-foreground text-center py-1">{d}</div>
                    ))}
                  </div>
                  {/* Days grid */}
                  <div className="grid grid-cols-7 border-t border-l border-border">
                    {monthDays.map((day, i) => {
                      const events = getEventsForDate(activities, day);
                      const isToday = isSameDay(day, new Date());
                      const isCurrentMonth = isSameMonth(day, currentDate);
                      return (
                        <div
                          key={i}
                          className={`min-h-[90px] border-r border-b border-border p-1 cursor-pointer hover:bg-muted/30 transition-colors ${
                            !isCurrentMonth ? 'bg-muted/10' : ''
                          }`}
                          onClick={() => handleDayClick(day)}
                        >
                          <div className={`text-xs font-medium mb-0.5 w-6 h-6 flex items-center justify-center rounded-full ${
                            isToday ? 'bg-primary text-primary-foreground' : !isCurrentMonth ? 'text-muted-foreground/40' : 'text-foreground'
                          }`}>
                            {format(day, 'd')}
                          </div>
                          <div className="space-y-0.5">
                            {events.slice(0, 3).map(ev => (
                              <EventBadge key={ev.id} activity={ev} onClick={() => handleEventClick(ev)} />
                            ))}
                            {events.length > 3 && (
                              <span className="text-[9px] text-muted-foreground px-1">+{events.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {viewMode === 'week' && (
                <div>
                  <div className="grid grid-cols-8 border-t border-l border-border">
                    {/* Header row */}
                    <div className="border-r border-b border-border p-1 text-[10px] text-muted-foreground" />
                    {weekDays.map((day, i) => (
                      <div key={i} className={`border-r border-b border-border p-1 text-center ${isSameDay(day, new Date()) ? 'bg-primary/5' : ''}`}>
                        <div className="text-[10px] text-muted-foreground">{format(day, 'EEE')}</div>
                        <div className={`text-sm font-semibold ${isSameDay(day, new Date()) ? 'text-primary' : ''}`}>{format(day, 'd')}</div>
                      </div>
                    ))}
                    {/* Time slots */}
                    {hours.map(hour => (
                      <div key={hour} className="contents">
                        <div className="border-r border-b border-border p-1 text-[10px] text-muted-foreground text-right pr-2">
                          {hour.toString().padStart(2, '0')}:00
                        </div>
                        {weekDays.map((day, di) => {
                          const slotEvents = activities.filter(a => {
                            const d = a.due_date ? new Date(a.due_date) : null;
                            return d && isSameDay(d, day) && d.getHours() === hour;
                          });
                          return (
                            <div
                              key={di}
                              className="border-r border-b border-border p-0.5 min-h-[40px] cursor-pointer hover:bg-muted/20 transition-colors"
                              onClick={() => {
                                const clickDate = addHours(startOfDay(day), hour);
                                handleDayClick(clickDate);
                              }}
                            >
                              {slotEvents.map(ev => (
                                <EventBadge key={ev.id} activity={ev} onClick={() => handleEventClick(ev)} />
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewMode === 'day' && (
                <div className="border-t border-border">
                  {hours.map(hour => {
                    const slotEvents = activities.filter(a => {
                      const d = a.due_date ? new Date(a.due_date) : null;
                      return d && isSameDay(d, currentDate) && d.getHours() === hour;
                    });
                    return (
                      <div
                        key={hour}
                        className="flex border-b border-border min-h-[48px] cursor-pointer hover:bg-muted/20 transition-colors"
                        onClick={() => handleDayClick(addHours(startOfDay(currentDate), hour))}
                      >
                        <div className="w-16 shrink-0 text-right pr-3 py-2 text-[11px] text-muted-foreground border-r border-border">
                          {hour.toString().padStart(2, '0')}:00
                        </div>
                        <div className="flex-1 p-1 space-y-0.5">
                          {slotEvents.map(ev => (
                            <EventBadge key={ev.id} activity={ev} onClick={() => handleEventClick(ev)} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-border">
                {Object.entries(typeConfig).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <div key={type} className="flex items-center gap-1 text-[10px]">
                      <div className={`w-2.5 h-2.5 rounded-sm ${config.bg} border ${config.border}`} />
                      <Icon className={`h-3 w-3 ${config.color}`} />
                      <span className="text-muted-foreground">{config.label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Upcoming Events */}
        <div className="w-[260px] shrink-0 hidden lg:block">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Upcoming (7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {upcoming.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No upcoming events</p>
              ) : (
                <div className="space-y-2">
                  {upcoming.map(ev => {
                    const config = typeConfig[ev.type] || typeConfig.note;
                    const Icon = config.icon;
                    return (
                      <button
                        key={ev.id}
                        onClick={() => handleEventClick(ev)}
                        className={`w-full text-left p-2 rounded-lg border ${config.border} ${config.bg} hover:opacity-80 transition-opacity`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Icon className={`h-3 w-3 ${config.color}`} />
                          <span className="text-xs font-medium truncate">{ev.subject}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {ev.due_date ? format(new Date(ev.due_date), 'EEE, MMM d · h:mm a') : 'No date'}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {getUserName(ev.assigned_to)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sync placeholders */}
          <Card className="mt-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Calendar Sync</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs" disabled>
                <CalendarIcon className="h-3.5 w-3.5" />
                Connect Google Calendar
                <Badge variant="outline" className="ml-auto text-[9px]">Soon</Badge>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs" disabled>
                <CalendarIcon className="h-3.5 w-3.5" />
                Connect Outlook Calendar
                <Badge variant="outline" className="ml-auto text-[9px]">Soon</Badge>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby="event-detail-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {selectedActivity && (() => {
                const config = typeConfig[selectedActivity.type] || typeConfig.note;
                const Icon = config.icon;
                return <Icon className={`h-4 w-4 ${config.color}`} />;
              })()}
              {selectedActivity?.subject}
            </DialogTitle>
          </DialogHeader>
          <p id="event-detail-desc" className="sr-only">Details for the selected calendar event</p>
          {selectedActivity && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Type</p>
                  <Badge className={`${typeConfig[selectedActivity.type]?.bg} ${typeConfig[selectedActivity.type]?.color} border ${typeConfig[selectedActivity.type]?.border}`}>
                    {typeConfig[selectedActivity.type]?.label || selectedActivity.type}
                  </Badge>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Status</p>
                  <Badge variant={selectedActivity.status === 'completed' ? 'default' : 'outline'}>
                    {selectedActivity.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Date</p>
                  <p>{selectedActivity.due_date ? format(new Date(selectedActivity.due_date), 'PPP p') : 'No date'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Priority</p>
                  <p className="capitalize">{selectedActivity.priority || 'Normal'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] text-muted-foreground font-medium">Assigned To</p>
                  <p>{getUserName(selectedActivity.assigned_to)}</p>
                </div>
              </div>
              {selectedActivity.description && (
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium mb-1">Description</p>
                  <p className="text-xs text-muted-foreground">{selectedActivity.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Event Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby="create-event-desc">
          <DialogHeader>
            <DialogTitle className="text-base">New Event</DialogTitle>
          </DialogHeader>
          <p id="create-event-desc" className="sr-only">Create a new calendar event</p>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Subject</Label>
              <Input
                value={newEvent.subject}
                onChange={e => setNewEvent(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Event subject..."
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={newEvent.type} onValueChange={v => setNewEvent(prev => ({ ...prev, type: v as any }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={newEvent.priority || 'medium'} onValueChange={v => setNewEvent(prev => ({ ...prev, priority: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Date & Time</Label>
              <Input
                type="datetime-local"
                value={newEvent.due_date || ''}
                onChange={e => setNewEvent(prev => ({ ...prev, due_date: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={newEvent.description || ''}
                onChange={e => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Details..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={!newEvent.subject}>Create Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
