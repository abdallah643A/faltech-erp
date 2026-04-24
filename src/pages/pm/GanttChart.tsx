import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjects } from '@/hooks/useProjects';
import { useProjectTasks, ProjectTask } from '@/hooks/useProjectTasks';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  addMonths,
  subMonths,
  differenceInDays,
  isSameMonth,
  isToday,
  parseISO
} from 'date-fns';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

const priorityColors: Record<string, string> = {
  low: 'bg-slate-400',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

const statusColors: Record<string, string> = {
  todo: 'bg-slate-400',
  in_progress: 'bg-blue-500',
  in_review: 'bg-purple-500',
  done: 'bg-green-500',
  blocked: 'bg-red-500',
};

export default function GanttChart() {
  const { t } = useLanguage();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { tasks, isLoading } = useProjectTasks(projectId);
  
  const [currentDate, setCurrentDate] = useState(new Date());

  const project = projects?.find(p => p.id === projectId);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const tasksWithDates = useMemo(() => {
    return tasks?.filter(task => task.start_date || task.due_date) || [];
  }, [tasks]);

  const getTaskPosition = (task: ProjectTask) => {
    const startDate = task.start_date ? parseISO(task.start_date) : parseISO(task.due_date!);
    const endDate = task.due_date ? parseISO(task.due_date) : startDate;
    
    const startOffset = differenceInDays(startDate, monthStart);
    const duration = differenceInDays(endDate, startDate) + 1;
    
    // Only show tasks that overlap with current month
    if (startOffset + duration < 0 || startOffset >= daysInMonth.length) {
      return null;
    }
    
    const left = Math.max(0, startOffset);
    const right = Math.min(daysInMonth.length, startOffset + duration);
    const width = right - left;
    
    return { left, width };
  };

  if (!project) {
    return (
      <div className="text-center py-8">
        <p>Project not found</p>
        <Button variant="link" onClick={() => navigate('/pm/projects')}>
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/pm/projects')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">Gantt Chart</p>
        </div>
        
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
            <CalendarIcon className="h-4 w-4 mr-2" />
            {format(currentDate, 'MMMM yyyy')}
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading tasks...</div>
      ) : (
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0 h-full">
            <ScrollArea className="h-full">
              <div className="min-w-[800px]">
                {/* Header with days */}
                <div className="flex border-b sticky top-0 bg-background z-10">
                  <div className="w-64 shrink-0 p-3 border-r font-medium">
                    Task
                  </div>
                  <div className="flex flex-1">
                    {daysInMonth.map((day, index) => (
                      <div
                        key={index}
                        className={cn(
                          'flex-1 min-w-[40px] p-2 text-center text-xs border-r last:border-r-0',
                          isToday(day) && 'bg-primary/10',
                          !isSameMonth(day, currentDate) && 'text-muted-foreground'
                        )}
                      >
                        <div className="font-medium">{format(day, 'd')}</div>
                        <div className="text-muted-foreground">{format(day, 'EEE')}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Task rows */}
                {tasksWithDates.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No tasks with dates found. Add start/due dates to tasks to see them on the chart.
                  </div>
                ) : (
                  tasksWithDates.map((task) => {
                    const position = getTaskPosition(task);
                    
                    return (
                      <div key={task.id} className="flex border-b hover:bg-muted/50">
                        <div className="w-64 shrink-0 p-3 border-r">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{task.title}</span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {task.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          {task.assignee && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {task.assignee.full_name || task.assignee.email}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-1 relative">
                          {/* Background grid */}
                          {daysInMonth.map((day, index) => (
                            <div
                              key={index}
                              className={cn(
                                'flex-1 min-w-[40px] min-h-[60px] border-r last:border-r-0',
                                isToday(day) && 'bg-primary/5'
                              )}
                            />
                          ))}
                          
                          {/* Task bar */}
                          {position && (
                            <div
                              className="absolute top-1/2 -translate-y-1/2 h-6 rounded flex items-center justify-center text-white text-xs font-medium px-2 cursor-pointer hover:opacity-80 transition-opacity"
                              style={{
                                left: `calc(${(position.left / daysInMonth.length) * 100}% + 4px)`,
                                width: `calc(${(position.width / daysInMonth.length) * 100}% - 8px)`,
                                minWidth: '30px'
                              }}
                            >
                              <div className={cn('absolute inset-0 rounded', statusColors[task.status])} />
                              <span className="relative z-10 truncate">
                                {position.width > 3 ? task.title : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 flex-wrap">
        <span className="text-sm font-medium">Status:</span>
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={cn('w-3 h-3 rounded', color)} />
            <span className="text-xs text-muted-foreground capitalize">{status.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
