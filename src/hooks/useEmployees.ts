import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface Employee {
  id: string;
  employee_code: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  national_id: string | null;
  nationality: string | null;
  marital_status: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postal_code: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  department_id: string | null;
  position_id: string | null;
  manager_id: string | null;
  branch_id: string | null;
  company_id: string | null;
  region_id: string | null;
  hire_date: string;
  termination_date: string | null;
  employment_type: string | null;
  employment_status: string | null;
  work_location: string | null;
  bank_name: string | null;
  bank_account: string | null;
  iban: string | null;
  basic_salary: number | null;
  housing_allowance: number | null;
  transport_allowance: number | null;
  other_allowances: number | null;
  profile_image_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  department?: { id: string; name: string } | null;
  position?: { id: string; title: string } | null;
  manager?: { id: string; first_name: string; last_name: string }[] | null;
  branch?: { id: string; name: string } | null;
  company?: { id: string; name: string } | null;
  region?: { id: string; name: string } | null;
}

export interface EmployeeInsert {
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  national_id?: string | null;
  nationality?: string | null;
  marital_status?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  postal_code?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  department_id?: string | null;
  position_id?: string | null;
  manager_id?: string | null;
  branch_id?: string | null;
  company_id?: string | null;
  region_id?: string | null;
  hire_date?: string;
  employment_type?: string | null;
  employment_status?: string | null;
  work_location?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  iban?: string | null;
  basic_salary?: number | null;
  housing_allowance?: number | null;
  transport_allowance?: number | null;
  other_allowances?: number | null;
  user_id?: string | null;
}

export function useEmployees(activeOnly: boolean = true) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: employees = [], isLoading, error } = useQuery({
    queryKey: ['employees', activeOnly, activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('employees')
        .select(`
          *,
          department:departments!employees_department_id_fkey(id, name),
          position:positions!employees_position_id_fkey(id, title),
          branch:branches!employees_branch_id_fkey(id, name),
          company:companies!employees_company_id_fkey(id, name),
          region:regions!employees_region_id_fkey(id, name)
        `)
        .order('first_name', { ascending: true });
      
      if (activeOnly) {
        query = query.eq('employment_status', 'active');
      }
      if (activeCompanyId) {
        query = query.eq('company_id', activeCompanyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Employee[];
    },
  });

  const createEmployee = useMutation({
    mutationFn: async (employee: EmployeeInsert) => {
      const { data, error } = await supabase
        .from('employees')
        .insert({ ...employee, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Employee created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating employee', description: error.message, variant: 'destructive' });
    },
  });

  const updateEmployee = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Employee> & { id: string }) => {
      const { department, position, manager, branch, company, region, ...cleanUpdates } = updates as any;
      const { data, error } = await supabase
        .from('employees')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Employee updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating employee', description: error.message, variant: 'destructive' });
    },
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Employee deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting employee', description: error.message, variant: 'destructive' });
    },
  });

  return {
    employees,
    isLoading,
    error,
    createEmployee,
    updateEmployee,
    deleteEmployee,
  };
}

export function useDepartments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          manager:employees!departments_manager_id_fkey(id, first_name, last_name)
        `)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const createDepartment = useMutation({
    mutationFn: async (department: { name: string; code?: string | null; description?: string | null; manager_id?: string | null }) => {
      const { data, error } = await supabase
        .from('departments')
        .insert(department)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: 'Department created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating department', description: error.message, variant: 'destructive' });
    },
  });

  const updateDepartment = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; code?: string | null; description?: string | null; manager_id?: string | null }) => {
      const { data, error } = await supabase
        .from('departments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: 'Department updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating department', description: error.message, variant: 'destructive' });
    },
  });

  const deleteDepartment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: 'Department deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting department', description: error.message, variant: 'destructive' });
    },
  });

  return { departments, isLoading, createDepartment, updateDepartment, deleteDepartment };
}

export function usePositions(activeOnly: boolean = true) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: positions = [], isLoading } = useQuery({
    queryKey: ['positions', activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('positions')
        .select('*, department:departments(id, name)')
        .order('title', { ascending: true });
      
      if (activeOnly) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

  const createPosition = useMutation({
    mutationFn: async (position: { title: string; code?: string | null; department_id?: string | null; description?: string | null; min_salary?: number | null; max_salary?: number | null; is_active?: boolean }) => {
      const { data, error } = await supabase
        .from('positions')
        .insert(position)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      toast({ title: 'Position created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating position', description: error.message, variant: 'destructive' });
    },
  });

  const updatePosition = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; code?: string | null; department_id?: string | null; description?: string | null; min_salary?: number | null; max_salary?: number | null; is_active?: boolean }) => {
      const { data, error } = await supabase
        .from('positions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      toast({ title: 'Position updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating position', description: error.message, variant: 'destructive' });
    },
  });

  const deletePosition = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('positions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      toast({ title: 'Position deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting position', description: error.message, variant: 'destructive' });
    },
  });

  return { positions, isLoading, createPosition, updatePosition, deletePosition };
}
