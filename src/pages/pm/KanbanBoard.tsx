import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjects } from '@/hooks/useProjects';
import { useProjectTasks, ProjectTask } from '@/hooks/useProjectTasks';
import { useUsers } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Plus, 
  ArrowLeft,
  GripVertical,
  Clock,
  Calendar,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { TaskFormDialog } from '@/components/pm/TaskFormDialog';
import { TaskDetailsDialog } from '@/components/pm/TaskDetailsDialog';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked';

const columns: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'todo', title: 'To Do', color: 'bg-slate-100' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100' },
  { id: 'in_review', title: 'In Review', color: 'bg-purple-100' },
  { id: 'done', title: 'Done', color: 'bg-green-100' },
  { id: 'blocked', title: 'Blocked', color: 'bg-red-100' },
];

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export default function KanbanBoard() {
  const { t } = useLanguage();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { tasks, isLoading, createTask, updateTask, deleteTask } = useProjectTasks(projectId);
  const { users } = useUsers();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [detailsTask, setDetailsTask] = useState<ProjectTask | null>(null);
  const [draggedTask, setDraggedTask] = useState<ProjectTask | null>(null);

  const project = projects?.find(p => p.id === projectId);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, ProjectTask[]> = {
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
      blocked: [],
    };

    tasks?.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  const handleDragStart = (e: React.DragEvent, task: ProjectTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== status) {
      updateTask.mutate({ id: draggedTask.id, status });
    }
    setDraggedTask(null);
  };

  const handleCreateTask = (status: TaskStatus) => {
    setSelectedTask({ status, project_id: projectId } as ProjectTask);
    setIsFormOpen(true);
  };

  const handleSubmitTask = (data: Partial<ProjectTask>) => {
    if (selectedTask?.id) {
      updateTask.mutate({ id: selectedTask.id, ...data });
    } else {
      createTask.mutate({ ...data, project_id: projectId });
    }
    setIsFormOpen(false);
    setSelectedTask(null);
  };

  const handleDeleteTask = (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask.mutate(id);
      setDetailsTask(null);
    }
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
          <p className="text-muted-foreground">Kanban Board</p>
        </div>
        <Button className="ml-auto" onClick={() => handleCreateTask('todo')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading tasks...</div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 min-w-max h-full pb-4">
            {columns.map((column) => (
              <div
                key={column.id}
                className={cn(
                  'w-80 rounded-lg p-3 flex flex-col',
                  column.color
                )}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{column.title}</h3>
                    <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {tasksByStatus[column.id].length}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleCreateTask(column.id)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto">
                  {tasksByStatus[column.id].map((task) => (
                    <Card
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onClick={() => setDetailsTask(task)}
                      className={cn(
                        'cursor-pointer hover:shadow-md transition-shadow',
                        draggedTask?.id === task.id && 'opacity-50'
                      )}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 cursor-grab" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {task.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge className={cn('text-xs', priorityColors[task.priority])}>
                                {task.priority}
                              </Badge>
                              
                              {task.due_date && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(task.due_date), 'MMM d')}
                                </span>
                              )}
                              
                              {task.estimated_hours > 0 && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {task.estimated_hours}h
                                </span>
                              )}
                            </div>
                            
                            {task.assignee && (
                              <div className="flex items-center gap-2 mt-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarFallback className="text-xs">
                                    {task.assignee.full_name?.charAt(0) || task.assignee.email.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground truncate">
                                  {task.assignee.full_name || task.assignee.email}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <TaskFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        task={selectedTask}
        projectId={projectId || ''}
        users={users || []}
        onSubmit={handleSubmitTask}
      />

      <TaskDetailsDialog
        open={!!detailsTask}
        onOpenChange={(open) => !open && setDetailsTask(null)}
        task={detailsTask}
        onEdit={(task) => {
          setDetailsTask(null);
          setSelectedTask(task);
          setIsFormOpen(true);
        }}
        onDelete={handleDeleteTask}
        onStatusChange={(id, status) => updateTask.mutate({ id, status })}
      />
    </div>
  );
}
