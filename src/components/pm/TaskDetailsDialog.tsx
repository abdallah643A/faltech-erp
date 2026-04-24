import { useState } from 'react';
import { ProjectTask, useTaskComments, useTimeEntries } from '@/hooks/useProjectTasks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Pencil, 
  Trash2, 
  Calendar, 
  Clock,
  User,
  Send,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const statusColors: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  in_review: 'bg-purple-100 text-purple-700',
  done: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
};

interface TaskDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: ProjectTask | null;
  onEdit: (task: ProjectTask) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: ProjectTask['status']) => void;
}

export function TaskDetailsDialog({ 
  open, 
  onOpenChange, 
  task, 
  onEdit, 
  onDelete,
  onStatusChange 
}: TaskDetailsDialogProps) {
  const { comments, addComment } = useTaskComments(task?.id);
  const { timeEntries, addTimeEntry } = useTimeEntries(task?.id);
  const [newComment, setNewComment] = useState('');
  const [newHours, setNewHours] = useState('');
  const [newTimeDesc, setNewTimeDesc] = useState('');

  if (!task) return null;

  const handleAddComment = () => {
    if (newComment.trim()) {
      addComment.mutate({ taskId: task.id, content: newComment });
      setNewComment('');
    }
  };

  const handleAddTimeEntry = () => {
    const hours = parseFloat(newHours);
    if (hours > 0) {
      addTimeEntry.mutate({ task_id: task.id, hours, description: newTimeDesc });
      setNewHours('');
      setNewTimeDesc('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl">{task.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                <Badge className={statusColors[task.status]}>{task.status.replace('_', ' ')}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => onEdit(task)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(task.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {task.assignee && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Assignee:</span>
                <span>{task.assignee.full_name || task.assignee.email}</span>
              </div>
            )}
            {task.due_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Due:</span>
                <span>{format(new Date(task.due_date), 'PPP')}</span>
              </div>
            )}
            {task.estimated_hours > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Estimated:</span>
                <span>{task.estimated_hours}h</span>
              </div>
            )}
            {task.actual_hours > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Logged:</span>
                <span>{task.actual_hours}h</span>
              </div>
            )}
          </div>

          {task.description && (
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Status Update */}
          <div>
            <h4 className="font-medium mb-2">Update Status</h4>
            <div className="flex gap-2 flex-wrap">
              {(['todo', 'in_progress', 'in_review', 'done', 'blocked'] as const).map((status) => (
                <Button
                  key={status}
                  variant={task.status === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onStatusChange(task.id, status)}
                >
                  {status.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>

          <Tabs defaultValue="comments" className="w-full">
            <TabsList>
              <TabsTrigger value="comments">Comments ({comments?.length || 0})</TabsTrigger>
              <TabsTrigger value="time">Time Entries ({timeEntries?.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="comments" className="space-y-4">
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {comments?.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {comment.user?.full_name?.charAt(0) || comment.user?.email?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {comment.user?.full_name || comment.user?.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{comment.content}</p>
                    </div>
                  </div>
                ))}
                {(!comments || comments.length === 0) && (
                  <p className="text-muted-foreground text-sm text-center py-4">No comments yet</p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                />
                <Button size="icon" onClick={handleAddComment}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="time" className="space-y-4">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {timeEntries?.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entry.hours}h</span>
                        <span className="text-sm text-muted-foreground">
                          {entry.user?.full_name || entry.user?.email}
                        </span>
                      </div>
                      {entry.description && (
                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.entry_date), 'MMM d')}
                    </span>
                  </div>
                ))}
                {(!timeEntries || timeEntries.length === 0) && (
                  <p className="text-muted-foreground text-sm text-center py-4">No time logged yet</p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.5"
                  placeholder="Hours"
                  className="w-24"
                  value={newHours}
                  onChange={(e) => setNewHours(e.target.value)}
                />
                <Input
                  placeholder="Description (optional)"
                  className="flex-1"
                  value={newTimeDesc}
                  onChange={(e) => setNewTimeDesc(e.target.value)}
                />
                <Button size="icon" onClick={handleAddTimeEntry}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
