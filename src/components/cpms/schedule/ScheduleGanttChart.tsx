import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ScheduleActivity } from '@/hooks/useProjectSchedule';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Diamond, AlertTriangle, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval,
  addMonths, subMonths, differenceInDays, isToday, parseISO, addDays, startOfWeek, endOfWeek,
  isSameMonth, getWeek,
} from 'date-fns';

type ViewMode = 'daily' | 'weekly' | 'monthly';

interface Props {
  activities: ScheduleActivity[];
  currentDate: Date;
  onDateChange: (d: Date) => void;
  onDragUpdate: (id: string, newStart: string, newEnd: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  expanded: Set<string>;
}

export default function ScheduleGanttChart({
  activities, currentDate, onDateChange, onDragUpdate, viewMode, onViewModeChange, expanded,
}: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ id: string; startX: number; origStart: string; origEnd: string } | null>(null);
  const [localActivities, setLocalActivities] = useState(activities);

  useEffect(() => { setLocalActivities(activities); }, [activities]);

  // Time range
  const rangeMonths = viewMode === 'monthly' ? 6 : viewMode === 'weekly' ? 3 : 1;
  const rangeStart = startOfMonth(currentDate);
  const rangeEnd = endOfMonth(addMonths(currentDate, rangeMonths - 1));
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  const totalDays = days.length;

  // Column headers
  const monthHeaders = useMemo(() => {
    const months: { label: string; span: number }[] = [];
    let currentMonth = '';
    days.forEach(d => {
      const m = format(d, 'MMM yyyy');
      if (m !== currentMonth) { months.push({ label: m, span: 1 }); currentMonth = m; }
      else { months[months.length - 1].span++; }
    });
    return months;
  }, [days]);

  const colWidth = viewMode === 'daily' ? 32 : viewMode === 'weekly' ? 20 : 8;

  const getBarPosition = (activity: ScheduleActivity) => {
    if (!activity.start_date) return null;
    const startDate = parseISO(activity.start_date);
    const endDate = activity.end_date ? parseISO(activity.end_date) : addDays(startDate, (activity.duration || 1) - 1);
    const startOffset = differenceInDays(startDate, rangeStart);
    const duration = differenceInDays(endDate, startDate) + 1;
    if (startOffset + duration < 0 || startOffset >= totalDays) return null;
    const left = Math.max(0, startOffset);
    const right = Math.min(totalDays, startOffset + duration);
    return { left, width: right - left };
  };

  const getBaselinePosition = (activity: ScheduleActivity) => {
    if (!activity.baseline_start || !activity.baseline_end) return null;
    const startDate = parseISO(activity.baseline_start);
    const endDate = parseISO(activity.baseline_end);
    const startOffset = differenceInDays(startDate, rangeStart);
    const duration = differenceInDays(endDate, startDate) + 1;
    if (startOffset + duration < 0 || startOffset >= totalDays) return null;
    const left = Math.max(0, startOffset);
    const right = Math.min(totalDays, startOffset + duration);
    return { left, width: right - left };
  };

  // Drag
  const handleMouseDown = useCallback((e: React.MouseEvent, activity: ScheduleActivity) => {
    if (!activity.start_date || !activity.end_date) return;
    e.preventDefault();
    setDragging({ id: activity.id, startX: e.clientX, origStart: activity.start_date, origEnd: activity.end_date });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    const deltaPx = e.clientX - dragging.startX;
    const deltaDays = Math.round(deltaPx / colWidth);
    if (deltaDays === 0) return;
    setLocalActivities(prev => prev.map(a => {
      if (a.id !== dragging.id) return a;
      const newStart = addDays(parseISO(dragging.origStart), deltaDays);
      const newEnd = addDays(parseISO(dragging.origEnd), deltaDays);
      return { ...a, start_date: format(newStart, 'yyyy-MM-dd'), end_date: format(newEnd, 'yyyy-MM-dd') };
    }));
  }, [dragging, colWidth]);

  const handleMouseUp = useCallback(() => {
    if (!dragging) return;
    const activity = localActivities.find(a => a.id === dragging.id);
    if (activity && (activity.start_date !== dragging.origStart || activity.end_date !== dragging.origEnd)) {
      onDragUpdate(activity.id, activity.start_date!, activity.end_date!);
    }
    setDragging(null);
  }, [dragging, localActivities, onDragUpdate]);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Today marker position
  const todayOffset = differenceInDays(new Date(), rangeStart);
  const showToday = todayOffset >= 0 && todayOffset < totalDays;

  // Filter visible based on expand state
  const visibleActivities = localActivities.filter(a => isVisibleInTree(a, localActivities, expanded));

  return (
    <div className="border rounded-lg overflow-hidden" ref={chartRef}>
      {/* Controls */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onDateChange(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onDateChange(new Date())}>
            {format(currentDate, 'MMM yyyy')}
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onDateChange(addMonths(currentDate, 1))}>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          {(['daily', 'weekly', 'monthly'] as ViewMode[]).map(m => (
            <Button key={m} variant={viewMode === m ? 'default' : 'outline'} size="sm" className="h-7 text-xs capitalize"
              onClick={() => onViewModeChange(m)}>
              {m}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="max-h-[560px]">
        <div style={{ minWidth: totalDays * colWidth + 40 }}>
          {/* Month headers */}
          <div className="flex sticky top-0 bg-background z-10 border-b">
            {monthHeaders.map((m, i) => (
              <div key={i} className="text-[10px] font-semibold text-center border-r p-1"
                style={{ width: m.span * colWidth }}>
                {m.label}
              </div>
            ))}
          </div>

          {/* Day headers */}
          {viewMode === 'daily' && (
            <div className="flex sticky top-[28px] bg-background z-10 border-b">
              {days.map((day, i) => (
                <div key={i} className={cn(
                  'text-center text-[9px] border-r p-0.5',
                  isToday(day) && 'bg-primary/10 font-bold',
                  [0, 6].includes(day.getDay()) && 'bg-muted/30 text-muted-foreground',
                )} style={{ width: colWidth }}>
                  <div>{format(day, 'd')}</div>
                  <div className="text-muted-foreground">{format(day, 'EE')}</div>
                </div>
              ))}
            </div>
          )}

          {/* Activity bars */}
          {visibleActivities.map(activity => {
            const pos = getBarPosition(activity);
            const baselinePos = getBaselinePosition(activity);
            const isMilestone = activity.level_type === 'milestone' || activity.type === 'milestone';
            const isCritical = activity.is_critical;
            const isStage = activity.level_type === 'stage';
            const isDelayed = activity.status === 'delayed';
            const isCompleted = activity.status === 'completed';
            const progress = activity.progress_pct || 0;
            const isDraggingThis = dragging?.id === activity.id;

            const barColor = isCompleted ? 'bg-green-500' : isDelayed ? 'bg-destructive' : isCritical ? 'bg-destructive' : isStage ? 'bg-indigo-500' : 'bg-primary';

            return (
              <div key={activity.id} className={cn(
                'flex relative border-b',
                isStage && 'bg-primary/5',
              )} style={{ height: 36 }}>
                {/* Grid lines */}
                {viewMode === 'daily' && days.map((day, i) => (
                  <div key={i} className={cn(
                    'absolute top-0 bottom-0 border-r',
                    isToday(day) && 'bg-primary/5',
                    [0, 6].includes(day.getDay()) && 'bg-muted/10',
                  )} style={{ left: i * colWidth, width: colWidth }} />
                ))}

                {/* Today marker */}
                {showToday && (
                  <div className="absolute top-0 bottom-0 w-0.5 bg-destructive/60 z-10" style={{ left: todayOffset * colWidth + colWidth / 2 }} />
                )}

                {/* Baseline bar (ghost) */}
                {baselinePos && !isMilestone && (
                  <div className="absolute top-1 h-2 bg-muted-foreground/20 rounded-sm border border-dashed border-muted-foreground/30 z-[1]"
                    style={{
                      left: baselinePos.left * colWidth + 2,
                      width: baselinePos.width * colWidth - 4,
                    }}
                  />
                )}

                {/* Task bar or milestone */}
                {pos && (
                  isMilestone ? (
                    <div className="absolute z-[5]" style={{ left: pos.left * colWidth + colWidth / 2 - 6, top: 10 }}>
                      <Diamond className="h-4 w-4 text-amber-500 fill-amber-400" />
                    </div>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              'absolute z-[5] rounded-sm cursor-grab select-none',
                              isDraggingThis && 'cursor-grabbing ring-2 ring-primary',
                              isStage && 'h-3 top-[14px]',
                              !isStage && 'h-5 top-[8px]',
                            )}
                            style={{
                              left: pos.left * colWidth + 2,
                              width: Math.max(pos.width * colWidth - 4, 6),
                            }}
                            onMouseDown={(e) => handleMouseDown(e, activity)}
                          >
                            <div className={cn('absolute inset-0 rounded-sm opacity-80', barColor)} />
                            {progress > 0 && (
                              <div className="absolute inset-y-0 left-0 rounded-sm bg-foreground/20" style={{ width: `${Math.min(100, progress)}%` }} />
                            )}
                            {!isStage && pos.width > 3 && (
                              <span className="relative z-10 text-primary-foreground text-[8px] font-medium px-1 truncate block leading-5">
                                {activity.name}
                              </span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          <div className="space-y-0.5">
                            <p className="font-bold">{activity.code} – {activity.name}</p>
                            <p>Planned: {activity.start_date} → {activity.end_date}</p>
                            {activity.actual_start && <p>Actual: {activity.actual_start} → {activity.actual_end || '...'}</p>}
                            <p>Progress: {progress}% | Status: {activity.status}</p>
                            {activity.resource_names && <p>👤 {activity.resource_names}</p>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                )}
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Legend */}
      <div className="flex items-center gap-3 p-2 border-t text-[10px] flex-wrap bg-muted/20">
        <span className="font-medium">Legend:</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-indigo-500" /> Stage</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-primary" /> Task</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-green-500" /> Completed</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-destructive" /> Delayed/Critical</span>
        <span className="flex items-center gap-1"><Diamond className="h-3 w-3 text-amber-500" /> Milestone</span>
        <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-muted-foreground/30 border border-dashed" /> Baseline</span>
        <span className="flex items-center gap-1"><span className="w-0.5 h-3 bg-destructive/60" /> Today</span>
      </div>
    </div>
  );
}

function isVisibleInTree(activity: ScheduleActivity, all: ScheduleActivity[], expanded: Set<string>): boolean {
  if (!activity.parent_activity_id) return true;
  if (!expanded.has(activity.parent_activity_id)) return false;
  const parent = all.find(a => a.id === activity.parent_activity_id);
  if (!parent) return true;
  return isVisibleInTree(parent, all, expanded);
}
