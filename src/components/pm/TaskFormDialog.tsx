import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ProjectTask } from '@/hooks/useProjectTasks';
import { useDimensions } from '@/hooks/useDimensions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Partial<ProjectTask> | null;
  projectId: string;
  users?: Array<{ id: string; email: string; full_name?: string }>;
  onSubmit: (data: Partial<ProjectTask>) => void;
}

export function TaskFormDialog({ open, onOpenChange, task, projectId, users, onSubmit }: TaskFormDialogProps) {
  const { activeDimensions: employeeDimensions } = useDimensions('employees');
  const { register, handleSubmit, reset, setValue, watch } = useForm<Partial<ProjectTask>>({
    defaultValues: {
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      assignee_id: '',
      start_date: '',
      due_date: '',
      estimated_hours: 0,
    },
  });

  useEffect(() => {
    if (task) {
      reset({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        assignee_id: task.assignee_id || '',
        start_date: task.start_date || '',
        due_date: task.due_date || '',
        estimated_hours: task.estimated_hours || 0,
      });
    } else {
      reset({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assignee_id: '',
        start_date: '',
        due_date: '',
        estimated_hours: 0,
      });
    }
  }, [task, reset]);

  const onFormSubmit = (data: Partial<ProjectTask>) => {
    onSubmit({
      ...data,
      project_id: projectId,
      assignee_id: data.assignee_id || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task?.id ? 'Edit Task' : 'Create New Task'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              {...register('title', { required: true })}
              placeholder="Enter task title"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Task description..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={watch('status')}
                onValueChange={(value) => setValue('status', value as ProjectTask['status'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={watch('priority')}
                onValueChange={(value) => setValue('priority', value as ProjectTask['priority'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="assignee">Assignee</Label>
            <Select
              value={watch('assignee_id') || 'unassigned'}
              onValueChange={(value) => setValue('assignee_id', value === 'unassigned' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {employeeDimensions.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} ({emp.cost_center})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
              />
            </div>

            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                {...register('due_date')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="estimated_hours">Estimated Hours</Label>
            <Input
              id="estimated_hours"
              type="number"
              step="0.5"
              {...register('estimated_hours', { valueAsNumber: true })}
              placeholder="0"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {task?.id ? 'Update' : 'Create'} Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
