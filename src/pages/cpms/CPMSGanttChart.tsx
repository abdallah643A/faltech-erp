import { useState, useMemo, useCallback, useRef } from 'react';
import { useCPMS } from '@/hooks/useCPMS';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Diamond, Layers, AlertTriangle,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths,
  differenceInDays, isToday, parseISO, addDays,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface ScheduleActivity {
  id: string;
  code: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  actual_start: string | null;
  actual_end: string | null;
  duration: number | null;
  progress_pct: number | null;
  is_critical: boolean | null;
  float_days: number | null;
  type: string | null;
  predecessors: any;
  resource_names: string | null;
  sort_order: number | null;
  wbs_id: string | null;
  schedule_id?: string;
}

export default function CPMSGanttChart() {
  const { t } = useLanguage();
  const { projects } = useCPMS();
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activities, setActivities] = useState<ScheduleActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dragging, setDragging] = useState<{ id: string; startX: number; origStart: string; origEnd: string } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const fetchActivities = async (projId: string) => {
    setLoading(true);
    const { data: schedules } = await supabase.from('cpms_schedules' as any).select('id').eq('project_id', projId).limit(1);
    if (schedules && schedules.length > 0) {
      const { data } = await supabase.from('cpms_schedule_activities' as any)
        .select('*').eq('schedule_id', (schedules[0] as any).id).order('sort_order');
      setActivities((data || []) as any[]);
    } else {
      setActivities([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedProjectId) fetchActivities(selectedProjectId);
    else setActivities([]);
  }, [selectedProjectId]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const dayWidth = chartRef.current ? (chartRef.current.clientWidth - 288) / days.length : 32;

  const getBarPosition = (activity: ScheduleActivity) => {
    if (!activity.start_date) return null;
    const startDate = parseISO(activity.start_date);
    const endDate = activity.end_date ? parseISO(activity.end_date) : addDays(startDate, (activity.duration || 1) - 1);
    const startOffset = differenceInDays(startDate, monthStart);
    const duration = differenceInDays(endDate, startDate) + 1;
    if (startOffset + duration < 0 || startOffset >= days.length) return null;
    const left = Math.max(0, startOffset);
    const right = Math.min(days.length, startOffset + duration);
    return { left, width: right - left, startDate, endDate };
  };

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, activity: ScheduleActivity) => {
    if (!activity.start_date || !activity.end_date) return;
    e.preventDefault();
    setDragging({
      id: activity.id,
      startX: e.clientX,
      origStart: activity.start_date,
      origEnd: activity.end_date,
    });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    const deltaPx = e.clientX - dragging.startX;
    const deltaDays = Math.round(deltaPx / Math.max(dayWidth, 20));
    if (deltaDays === 0) return;

    setActivities(prev => prev.map(a => {
      if (a.id !== dragging.id) return a;
      const newStart = addDays(parseISO(dragging.origStart), deltaDays);
      const newEnd = addDays(parseISO(dragging.origEnd), deltaDays);
      return { ...a, start_date: format(newStart, 'yyyy-MM-dd'), end_date: format(newEnd, 'yyyy-MM-dd') };
    }));
  }, [dragging, dayWidth]);

  const handleMouseUp = useCallback(async () => {
    if (!dragging) return;
    const activity = activities.find(a => a.id === dragging.id);
    if (!activity || (activity.start_date === dragging.origStart && activity.end_date === dragging.origEnd)) {
      setDragging(null);
      return;
    }

    // Save to DB
    const { error } = await supabase.from('cpms_schedule_activities' as any)
      .update({ start_date: activity.start_date, end_date: activity.end_date })
      .eq('id', activity.id);

    if (error) {
      // Revert on error
      setActivities(prev => prev.map(a => a.id === dragging.id ? { ...a, start_date: dragging.origStart, end_date: dragging.origEnd } : a));
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Schedule updated', description: `${activity.name} moved to ${activity.start_date}` });

      // Update dependent tasks
      await cascadeDependencies(activity, activities);
    }

    setDragging(null);
  }, [dragging, activities, toast]);

  // Cascade dependency updates
  const cascadeDependencies = async (changedActivity: ScheduleActivity, allActivities: ScheduleActivity[]) => {
    const dependents = allActivities.filter(a => {
      if (!a.predecessors || !Array.isArray(a.predecessors)) return false;
      return (a.predecessors as any[]).some(p => (p.id || p) === changedActivity.id);
    });

    if (dependents.length === 0) return;

    const changedEnd = parseISO(changedActivity.end_date!);
    const updates: ScheduleActivity[] = [];

    for (const dep of dependents) {
      if (!dep.start_date || !dep.end_date) continue;
      const depDuration = differenceInDays(parseISO(dep.end_date), parseISO(dep.start_date));
      const newStart = addDays(changedEnd, 1); // FS dependency
      const newEnd = addDays(newStart, depDuration);
      const newStartStr = format(newStart, 'yyyy-MM-dd');
      const newEndStr = format(newEnd, 'yyyy-MM-dd');

      if (newStartStr !== dep.start_date) {
        await supabase.from('cpms_schedule_activities' as any)
          .update({ start_date: newStartStr, end_date: newEndStr })
          .eq('id', dep.id);
        updates.push({ ...dep, start_date: newStartStr, end_date: newEndStr });
      }
    }

    if (updates.length > 0) {
      setActivities(prev => prev.map(a => {
        const updated = updates.find(u => u.id === a.id);
        return updated || a;
      }));
      toast({ title: `${updates.length} dependent task(s) updated` });
    }
  };

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  const criticalActivities = activities.filter(a => a.is_critical);
  const milestones = activities.filter(a => a.type === 'milestone' || (a.duration !== null && a.duration === 0));

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            CPMS Gantt Chart
          </h1>
          <p className="text-sm text-muted-foreground">Drag task bars to reschedule · Dependencies auto-cascade</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select Project" /></SelectTrigger>
            <SelectContent>
              {projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.code} – {p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())} size="sm">
            <CalendarIcon className="h-4 w-4 mr-1" />
            {format(currentDate, 'MMM yyyy')}
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!selectedProjectId ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Select a project to view Gantt chart</CardContent></Card>
      ) : loading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Loading schedule...</CardContent></Card>
      ) : activities.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No schedule activities found.</CardContent></Card>
      ) : (
        <>
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <div className="flex items-center gap-1"><div className="w-4 h-2 rounded bg-destructive" /><span>Critical Path</span></div>
            <div className="flex items-center gap-1"><div className="w-4 h-2 rounded bg-primary" /><span>Normal (drag to move)</span></div>
            <div className="flex items-center gap-1"><div className="w-4 h-2 rounded bg-success opacity-50" /><span>Progress</span></div>
            <div className="flex items-center gap-1"><Diamond className="h-3 w-3 text-warning fill-warning" /><span>Milestone</span></div>
            <Badge variant="outline" className="text-[10px]">{criticalActivities.length} critical · {milestones.length} milestones</Badge>
          </div>

          <Card className="overflow-hidden">
            <ScrollArea className="max-h-[600px]">
              <div className="min-w-[1000px]" ref={chartRef}>
                {/* Timeline Header */}
                <div className="flex border-b sticky top-0 bg-background z-10">
                  <div className="w-72 shrink-0 p-2 border-r font-medium text-xs flex items-center gap-2">
                    <span>Activity</span>
                    <Badge variant="outline" className="text-[9px]">{activities.length}</Badge>
                  </div>
                  <div className="flex flex-1">
                    {days.map((day, i) => (
                      <div key={i} className={cn(
                        'flex-1 min-w-[32px] p-1 text-center text-[10px] border-r last:border-r-0',
                        isToday(day) && 'bg-primary/10',
                        [5, 6].includes(day.getDay()) && 'bg-muted/30'
                      )}>
                        <div className="font-semibold">{format(day, 'd')}</div>
                        <div className="text-muted-foreground">{format(day, 'EE')}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity Rows */}
                {activities.map(activity => {
                  const pos = getBarPosition(activity);
                  const isMilestone = activity.type === 'milestone' || (activity.duration !== null && activity.duration === 0);
                  const isCritical = activity.is_critical;
                  const progress = activity.progress_pct || 0;
                  const isDraggingThis = dragging?.id === activity.id;

                  return (
                    <div key={activity.id} className="flex border-b hover:bg-muted/30 group">
                      <div className="w-72 shrink-0 p-2 border-r">
                        <div className="flex items-center gap-1.5">
                          {isCritical && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                          {isMilestone && <Diamond className="h-3 w-3 text-warning fill-warning shrink-0" />}
                          <span className="text-xs font-medium truncate">{activity.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] font-mono text-muted-foreground">{activity.code}</span>
                          {activity.resource_names && <span className="text-[9px] text-muted-foreground truncate">👤 {activity.resource_names}</span>}
                          {progress > 0 && <Badge variant="outline" className="text-[9px] h-4">{progress}%</Badge>}
                          {activity.float_days != null && activity.float_days > 0 && <span className="text-[9px] text-muted-foreground">F:{activity.float_days}d</span>}
                        </div>
                      </div>

                      <div className="flex flex-1 relative">
                        {days.map((day, i) => (
                          <div key={i} className={cn(
                            'flex-1 min-w-[32px] min-h-[44px] border-r last:border-r-0',
                            isToday(day) && 'bg-primary/5',
                            [5, 6].includes(day.getDay()) && 'bg-muted/20'
                          )} />
                        ))}

                        {pos && (
                          isMilestone ? (
                            <div className="absolute top-1/2 -translate-y-1/2"
                              style={{ left: `calc(${(pos.left / days.length) * 100}% + ${32 / 2 - 6}px)` }}>
                              <Diamond className="h-4 w-4 text-warning fill-warning" />
                            </div>
                          ) : (
                            <div
                              className={cn(
                                'absolute top-1/2 -translate-y-1/2 h-5 cursor-grab select-none',
                                isDraggingThis && 'cursor-grabbing opacity-80 ring-2 ring-primary rounded-sm'
                              )}
                              style={{
                                left: `calc(${(pos.left / days.length) * 100}% + 2px)`,
                                width: `calc(${(pos.width / days.length) * 100}% - 4px)`,
                                minWidth: '8px'
                              }}
                              onMouseDown={(e) => handleMouseDown(e, activity)}
                            >
                              <div className={cn('absolute inset-0 rounded-sm opacity-80', isCritical ? 'bg-destructive' : 'bg-primary')} />
                              {progress > 0 && (
                                <div className="absolute inset-y-0 left-0 rounded-sm bg-success opacity-60" style={{ width: `${progress}%` }} />
                              )}
                              <span className="relative z-10 text-primary-foreground text-[9px] font-medium px-1 truncate block leading-5">
                                {pos.width > 3 ? activity.name : ''}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </Card>
        </>
      )}
    </div>
  );
}
