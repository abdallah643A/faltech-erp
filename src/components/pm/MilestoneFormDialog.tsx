import { useForm } from 'react-hook-form';
import { ProjectMilestone } from '@/hooks/useProjects';
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

interface MilestoneFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSubmit: (data: Partial<ProjectMilestone>) => void;
}

export function MilestoneFormDialog({ open, onOpenChange, projectId, onSubmit }: MilestoneFormDialogProps) {
  const { register, handleSubmit, reset } = useForm<Partial<ProjectMilestone>>({
    defaultValues: {
      name: '',
      description: '',
      due_date: '',
    },
  });

  const onFormSubmit = (data: Partial<ProjectMilestone>) => {
    onSubmit({ ...data, project_id: projectId });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Milestone</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Milestone Name *</Label>
            <Input
              id="name"
              {...register('name', { required: true })}
              placeholder="Enter milestone name"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Milestone description..."
              rows={3}
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Milestone</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
