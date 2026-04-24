import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { usePositions } from '@/hooks/useEmployees';
import { Loader2 } from 'lucide-react';

interface Position {
  id: string;
  title: string;
  code: string | null;
  description: string | null;
  department_id: string | null;
  min_salary: number | null;
  max_salary: number | null;
  is_active: boolean | null;
}

interface PositionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: Position | null;
  departments: { id: string; name: string }[];
}

export function PositionFormDialog({
  open,
  onOpenChange,
  position,
  departments,
}: PositionFormDialogProps) {
  const { createPosition, updatePosition } = usePositions(false);
  const isEditing = !!position;

  const [formData, setFormData] = useState({
    title: '',
    code: '',
    description: '',
    department_id: '',
    min_salary: 0,
    max_salary: 0,
    is_active: true,
  });

  useEffect(() => {
    if (position) {
      setFormData({
        title: position.title,
        code: position.code || '',
        description: position.description || '',
        department_id: position.department_id || '',
        min_salary: position.min_salary || 0,
        max_salary: position.max_salary || 0,
        is_active: position.is_active ?? true,
      });
    } else {
      setFormData({
        title: '',
        code: '',
        description: '',
        department_id: '',
        min_salary: 0,
        max_salary: 0,
        is_active: true,
      });
    }
  }, [position, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      title: formData.title,
      code: formData.code || null,
      description: formData.description || null,
      department_id: formData.department_id || null,
      min_salary: formData.min_salary || null,
      max_salary: formData.max_salary || null,
      is_active: formData.is_active,
    };
    
    if (isEditing) {
      updatePosition.mutate({ id: position.id, ...data });
    } else {
      createPosition.mutate(data);
    }
    onOpenChange(false);
  };

  const isPending = createPosition.isPending || updatePosition.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Position' : 'Add New Position'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Position Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., MGR, DEV"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department_id">Department</Label>
              <Select
                value={formData.department_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, department_id: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Department</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_salary">Min Salary (SAR)</Label>
              <Input
                id="min_salary"
                type="number"
                value={formData.min_salary || ''}
                onChange={(e) => setFormData({ ...formData, min_salary: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_salary">Max Salary (SAR)</Label>
              <Input
                id="max_salary"
                type="number"
                value={formData.max_salary || ''}
                onChange={(e) => setFormData({ ...formData, max_salary: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
