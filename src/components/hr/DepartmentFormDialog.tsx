import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDepartments, useEmployees } from '@/hooks/useEmployees';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Department {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  manager_id: string | null;
  region_id: string | null;
  company_id: string | null;
}

interface DepartmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: Department | null;
}

export function DepartmentFormDialog({
  open,
  onOpenChange,
  department,
}: DepartmentFormDialogProps) {
  const { createDepartment, updateDepartment } = useDepartments();
  const { employees } = useEmployees(true);
  const isEditing = !!department;

  // Fetch regions and companies
  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('regions').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('id, name, region_id').order('name');
      if (error) throw error;
      return data;
    },
  });

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    manager_id: '',
    region_id: '',
    company_id: '',
  });

  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name,
        code: department.code || '',
        description: department.description || '',
        manager_id: department.manager_id || '',
        region_id: department.region_id || '',
        company_id: department.company_id || '',
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        manager_id: '',
        region_id: '',
        company_id: '',
      });
    }
  }, [department, open]);

  // Filter companies by selected region
  const filteredCompanies = formData.region_id
    ? companies.filter(c => c.region_id === formData.region_id)
    : companies;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      name: formData.name,
      code: formData.code || null,
      description: formData.description || null,
      manager_id: formData.manager_id || null,
      region_id: formData.region_id || null,
      company_id: formData.company_id || null,
    };
    
    if (isEditing) {
      updateDepartment.mutate({ id: department.id, ...data });
    } else {
      createDepartment.mutate(data);
    }
    onOpenChange(false);
  };

  const isPending = createDepartment.isPending || updateDepartment.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Department' : 'Add New Department'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Department Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={formData.region_id || '__none__'}
                onValueChange={(v) => setFormData({ ...formData, region_id: v === '__none__' ? '' : v, company_id: '' })}>
                <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Region</SelectItem>
                  {regions.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Select value={formData.company_id || '__none__'}
                onValueChange={(v) => setFormData({ ...formData, company_id: v === '__none__' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Company</SelectItem>
                  {filteredCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g., HR, IT, FIN"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manager_id">Department Manager</Label>
            <Select
              value={formData.manager_id || 'none'}
              onValueChange={(value) => setFormData({ ...formData, manager_id: value === 'none' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Manager</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
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
