import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEmployees, Employee, EmployeeInsert } from '@/hooks/useEmployees';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  departments: { id: string; name: string }[];
  positions: { id: string; title: string }[];
  employees: { id: string; first_name: string; last_name: string }[];
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  departments,
  positions,
  employees,
}: EmployeeFormDialogProps) {
  const { createEmployee, updateEmployee } = useEmployees();
  const isEditing = !!employee;

  // Fetch regions, companies, branches
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

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('id, name, company_id').order('name');
      if (error) throw error;
      return data;
    },
  });

  const [formData, setFormData] = useState<EmployeeInsert>({
    employee_code: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    national_id: '',
    nationality: '',
    marital_status: '',
    address: '',
    city: '',
    country: 'Saudi Arabia',
    postal_code: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    department_id: '',
    position_id: '',
    manager_id: '',
    branch_id: '',
    company_id: '',
    region_id: '',
    hire_date: new Date().toISOString().split('T')[0],
    employment_type: 'full_time',
    employment_status: 'active',
    work_location: '',
    bank_name: '',
    bank_account: '',
    iban: '',
    basic_salary: 0,
    housing_allowance: 0,
    transport_allowance: 0,
    other_allowances: 0,
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        employee_code: employee.employee_code,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        phone: employee.phone || '',
        date_of_birth: employee.date_of_birth || '',
        gender: employee.gender || '',
        national_id: employee.national_id || '',
        nationality: employee.nationality || '',
        marital_status: employee.marital_status || '',
        address: employee.address || '',
        city: employee.city || '',
        country: employee.country || 'Saudi Arabia',
        postal_code: employee.postal_code || '',
        emergency_contact_name: employee.emergency_contact_name || '',
        emergency_contact_phone: employee.emergency_contact_phone || '',
        department_id: employee.department_id || '',
        position_id: employee.position_id || '',
        manager_id: employee.manager_id || '',
        branch_id: employee.branch_id || '',
        company_id: employee.company_id || '',
        region_id: employee.region_id || '',
        hire_date: employee.hire_date,
        employment_type: employee.employment_type || 'full_time',
        employment_status: employee.employment_status || 'active',
        work_location: employee.work_location || '',
        bank_name: employee.bank_name || '',
        bank_account: employee.bank_account || '',
        iban: employee.iban || '',
        basic_salary: employee.basic_salary || 0,
        housing_allowance: employee.housing_allowance || 0,
        transport_allowance: employee.transport_allowance || 0,
        other_allowances: employee.other_allowances || 0,
      });
    } else {
      setFormData({
        employee_code: `EMP${Date.now().toString().slice(-6)}`,
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        gender: '',
        national_id: '',
        nationality: '',
        marital_status: '',
        address: '',
        city: '',
        country: 'Saudi Arabia',
        postal_code: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        department_id: '',
        position_id: '',
        manager_id: '',
        branch_id: '',
        company_id: '',
        region_id: '',
        hire_date: new Date().toISOString().split('T')[0],
        employment_type: 'full_time',
        employment_status: 'active',
        work_location: '',
        bank_name: '',
        bank_account: '',
        iban: '',
        basic_salary: 0,
        housing_allowance: 0,
        transport_allowance: 0,
        other_allowances: 0,
      });
    }
  }, [employee, open]);

  // Filter companies by selected region
  const filteredCompanies = formData.region_id
    ? companies.filter(c => c.region_id === formData.region_id)
    : companies;

  // Filter branches by selected company
  const filteredBranches = formData.company_id
    ? branches.filter(b => b.company_id === formData.company_id)
    : branches;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      department_id: formData.department_id || null,
      position_id: formData.position_id || null,
      manager_id: formData.manager_id || null,
      branch_id: formData.branch_id || null,
      company_id: formData.company_id || null,
      region_id: formData.region_id || null,
      date_of_birth: formData.date_of_birth || null,
      phone: formData.phone || null,
      gender: formData.gender || null,
      national_id: formData.national_id || null,
      nationality: formData.nationality || null,
      marital_status: formData.marital_status || null,
      address: formData.address || null,
      city: formData.city || null,
      country: formData.country || null,
      postal_code: formData.postal_code || null,
      emergency_contact_name: formData.emergency_contact_name || null,
      emergency_contact_phone: formData.emergency_contact_phone || null,
      work_location: formData.work_location || null,
      bank_name: formData.bank_name || null,
      bank_account: formData.bank_account || null,
      iban: formData.iban || null,
    };
    
    if (isEditing) {
      updateEmployee.mutate({ id: employee.id, ...data });
    } else {
      createEmployee.mutate(data);
    }
    onOpenChange(false);
  };

  const isPending = createEmployee.isPending || updateEmployee.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="organization">Organization</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
              <TabsTrigger value="salary">Salary</TabsTrigger>
              <TabsTrigger value="banking">Banking</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employee_code">Employee Code *</Label>
                  <Input id="employee_code" value={formData.employee_code}
                    onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="national_id">National ID</Label>
                  <Input id="national_id" value={formData.national_id || ''}
                    onChange={(e) => setFormData({ ...formData, national_id: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input id="first_name" value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input id="last_name" value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input type="date" value={formData.date_of_birth || ''}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={formData.gender || '__none__'}
                    onValueChange={(v) => setFormData({ ...formData, gender: v === '__none__' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Not Specified</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Marital Status</Label>
                  <Select value={formData.marital_status || '__none__'}
                    onValueChange={(v) => setFormData({ ...formData, marital_status: v === '__none__' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Not Specified</SelectItem>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={formData.country || ''}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Nationality</Label>
                  <Input value={formData.nationality || ''}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Emergency Contact Name</Label>
                  <Input value={formData.emergency_contact_name || ''}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Emergency Contact Phone</Label>
                  <Input value={formData.emergency_contact_phone || ''}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })} />
                </div>
              </div>
            </TabsContent>

            {/* Organization Tab - Region, Company, Branch */}
            <TabsContent value="organization" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Select value={formData.region_id || '__none__'}
                    onValueChange={(v) => setFormData({ ...formData, region_id: v === '__none__' ? '' : v, company_id: '', branch_id: '' })}>
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
                    onValueChange={(v) => setFormData({ ...formData, company_id: v === '__none__' ? '' : v, branch_id: '' })}>
                    <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No Company</SelectItem>
                      {filteredCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Select value={formData.branch_id || '__none__'}
                    onValueChange={(v) => setFormData({ ...formData, branch_id: v === '__none__' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No Branch</SelectItem>
                      {filteredBranches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={formData.department_id || '__none__'}
                    onValueChange={(v) => setFormData({ ...formData, department_id: v === '__none__' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No Department</SelectItem>
                      {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Select value={formData.position_id || '__none__'}
                    onValueChange={(v) => setFormData({ ...formData, position_id: v === '__none__' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No Position</SelectItem>
                      {positions.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Manager</Label>
                <Select value={formData.manager_id || '__none__'}
                  onValueChange={(v) => setFormData({ ...formData, manager_id: v === '__none__' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Manager</SelectItem>
                    {employees.filter(emp => emp.id !== employee?.id).map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="employment" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hire Date *</Label>
                  <Input type="date" value={formData.hire_date || ''}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Work Location</Label>
                  <Input value={formData.work_location || ''}
                    onChange={(e) => setFormData({ ...formData, work_location: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Employment Type</Label>
                  <Select value={formData.employment_type || 'full_time'}
                    onValueChange={(v) => setFormData({ ...formData, employment_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.employment_status || 'active'}
                    onValueChange={(v) => setFormData({ ...formData, employment_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="salary" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Basic Salary (SAR)</Label>
                  <Input type="number" value={formData.basic_salary || 0}
                    onChange={(e) => setFormData({ ...formData, basic_salary: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Housing Allowance (SAR)</Label>
                  <Input type="number" value={formData.housing_allowance || 0}
                    onChange={(e) => setFormData({ ...formData, housing_allowance: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Transport Allowance (SAR)</Label>
                  <Input type="number" value={formData.transport_allowance || 0}
                    onChange={(e) => setFormData({ ...formData, transport_allowance: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Other Allowances (SAR)</Label>
                  <Input type="number" value={formData.other_allowances || 0}
                    onChange={(e) => setFormData({ ...formData, other_allowances: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Monthly Salary</p>
                <p className="text-2xl font-bold">
                  SAR {((formData.basic_salary || 0) + (formData.housing_allowance || 0) +
                    (formData.transport_allowance || 0) + (formData.other_allowances || 0)).toLocaleString()}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="banking" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input value={formData.bank_name || ''}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Bank Account Number</Label>
                <Input value={formData.bank_account || ''}
                  onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>IBAN</Label>
                <Input value={formData.iban || ''} placeholder="SA..."
                  onChange={(e) => setFormData({ ...formData, iban: e.target.value })} />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Employee' : 'Create Employee'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
