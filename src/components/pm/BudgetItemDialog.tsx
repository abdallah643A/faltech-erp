import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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

interface BudgetItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

interface BudgetItemForm {
  category: string;
  description: string;
  planned_amount: number;
  actual_amount: number;
  date: string;
}

const categories = [
  'Labor',
  'Materials',
  'Equipment',
  'Travel',
  'Software',
  'Consulting',
  'Miscellaneous',
];

function BudgetItemDialogInner({ open, onOpenChange, projectId }: BudgetItemDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { validate } = useRequiredFieldValidation();
  
  const { register, handleSubmit, reset, setValue, watch } = useForm<BudgetItemForm>({
    defaultValues: {
      category: 'Materials',
      description: '',
      planned_amount: 0,
      actual_amount: 0,
      date: new Date().toISOString().split('T')[0],
    },
  });

  const addBudgetItem = useMutation({
    mutationFn: async (data: BudgetItemForm) => {
      const { error } = await supabase
        .from('project_budget_items')
        .insert({ ...data, project_id: projectId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budget', projectId] });
      toast({ title: 'Budget item added successfully' });
      reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding budget item', description: error.message, variant: 'destructive' });
    },
  });

  const onFormSubmit = (data: BudgetItemForm) => {
    if (!validate(data as Record<string, any>, {
      category: 'Category',
      description: 'Description',
      planned_amount: 'Planned Amount',
      actual_amount: 'Actual Amount',
      date: 'Date',
    })) return;
    addBudgetItem.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Budget Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div>
            <RFLabel htmlFor="category" fieldName="category">Category</RFLabel>
            <Select
              value={watch('category')}
              onValueChange={(value) => setValue('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <RFLabel htmlFor="description" fieldName="description">Description</RFLabel>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Description..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <RFLabel htmlFor="planned_amount" fieldName="planned_amount">Planned Amount ($)</RFLabel>
              <Input
                id="planned_amount"
                type="number"
                step="0.01"
                {...register('planned_amount', { valueAsNumber: true })}
              />
            </div>

            <div>
              <RFLabel htmlFor="actual_amount" fieldName="actual_amount">Actual Amount ($)</RFLabel>
              <Input
                id="actual_amount"
                type="number"
                step="0.01"
                {...register('actual_amount', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div>
            <RFLabel htmlFor="date" fieldName="date">Date</RFLabel>
            <Input
              id="date"
              type="date"
              {...register('date')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addBudgetItem.isPending}>
              Add Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BudgetItemDialog(props: BudgetItemDialogProps) {
  return (
    <RequiredFieldsProvider module="budget_items">
      <BudgetItemDialogInner {...props} />
    </RequiredFieldsProvider>
  );
}
