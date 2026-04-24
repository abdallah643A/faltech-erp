import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Project } from '@/hooks/useProjects';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RequiredFieldsProvider, useRequiredFieldValidation } from '@/components/RequiredFieldsProvider';
import { RFLabel } from '@/components/ui/RFLabel';

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSubmit: (data: Partial<Project>) => void;
}

function ProjectFormDialogInner({ open, onOpenChange, project, onSubmit }: ProjectFormDialogProps) {
  const { validate } = useRequiredFieldValidation();
  const { register, handleSubmit, reset, setValue, watch } = useForm<Partial<Project>>({
    defaultValues: {
      name: '',
      description: '',
      code: '',
      status: 'planning',
      start_date: '',
      end_date: '',
      budget: 0,
    },
  });

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        description: project.description || '',
        code: project.code || '',
        status: project.status,
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        budget: project.budget || 0,
      });
    } else {
      reset({
        name: '',
        description: '',
        code: '',
        status: 'planning',
        start_date: '',
        end_date: '',
        budget: 0,
      });
    }
  }, [project, reset]);

  const onFormSubmit = (data: Partial<Project>) => {
    if (!validate(data as Record<string, any>, {
      name: 'Project Name',
      description: 'Description',
      code: 'Project Code',
      status: 'Status',
      start_date: 'Start Date',
      end_date: 'End Date',
      budget: 'Budget',
    })) return;
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'Create New Project'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <RFLabel htmlFor="name" fieldName="name">Project Name</RFLabel>
              <Input
                id="name"
                {...register('name', { required: true })}
                placeholder="Enter project name"
              />
            </div>

            <div>
              <RFLabel htmlFor="code" fieldName="code">Project Code</RFLabel>
              <Input
                id="code"
                {...register('code')}
                placeholder="e.g., PRJ-001"
              />
            </div>

            <div>
              <RFLabel htmlFor="status" fieldName="status">Status</RFLabel>
              <Select
                value={watch('status')}
                onValueChange={(value) => setValue('status', value as Project['status'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <RFLabel htmlFor="description" fieldName="description">Description</RFLabel>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Project description..."
                rows={3}
              />
            </div>

            <div>
              <RFLabel htmlFor="start_date" fieldName="start_date">Start Date</RFLabel>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
              />
            </div>

            <div>
              <RFLabel htmlFor="end_date" fieldName="end_date">End Date</RFLabel>
              <Input
                id="end_date"
                type="date"
                {...register('end_date')}
              />
            </div>

            <div className="col-span-2">
              <RFLabel htmlFor="budget" fieldName="budget">Budget ($)</RFLabel>
              <Input
                id="budget"
                type="number"
                {...register('budget', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {project ? 'Update' : 'Create'} Project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectFormDialog(props: ProjectFormDialogProps) {
  return (
    <RequiredFieldsProvider module="projects">
      <ProjectFormDialogInner {...props} />
    </RequiredFieldsProvider>
  );
}
