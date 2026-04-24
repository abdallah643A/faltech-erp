import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface TrainingProgram {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  trainer: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  max_participants: number | null;
  status: string | null;
  cost: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  enrollments?: TrainingEnrollment[];
}

export interface TrainingEnrollment {
  id: string;
  training_id: string;
  employee_id: string;
  status: string | null;
  completion_date: string | null;
  score: number | null;
  certificate_url: string | null;
  notes: string | null;
  created_at: string;
  employee?: { id: string; first_name: string; last_name: string; employee_code: string };
}

export function useTrainingPrograms() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['training-programs', activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('training_programs')
        .select('*')
        .order('created_at', { ascending: false });
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as TrainingProgram[];
    },
  });

  const createProgram = useMutation({
    mutationFn: async (program: Partial<TrainingProgram>) => {
      const { data, error } = await supabase
        .from('training_programs')
        .insert(program as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-programs'] });
      toast({ title: 'Training program created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateProgram = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingProgram> & { id: string }) => {
      const { data, error } = await supabase
        .from('training_programs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-programs'] });
      toast({ title: 'Training program updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteProgram = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('training_programs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-programs'] });
      toast({ title: 'Training program deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return { programs, isLoading, createProgram, updateProgram, deleteProgram };
}

export function useTrainingEnrollments(trainingId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['training-enrollments', trainingId],
    queryFn: async () => {
      if (!trainingId) return [];
      const { data, error } = await supabase
        .from('training_enrollments')
        .select('*, employee:employees(id, first_name, last_name, employee_code)')
        .eq('training_id', trainingId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TrainingEnrollment[];
    },
    enabled: !!trainingId,
  });

  const enrollEmployee = useMutation({
    mutationFn: async ({ trainingId, employeeId }: { trainingId: string; employeeId: string }) => {
      const { data, error } = await supabase
        .from('training_enrollments')
        .insert({ training_id: trainingId, employee_id: employeeId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-enrollments'] });
      toast({ title: 'Employee enrolled' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateEnrollment = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingEnrollment> & { id: string }) => {
      const { employee, ...cleanUpdates } = updates as any;
      const { data, error } = await supabase
        .from('training_enrollments')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-enrollments'] });
      toast({ title: 'Enrollment updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return { enrollments, isLoading, enrollEmployee, updateEnrollment };
}
