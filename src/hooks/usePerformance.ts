import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PerformanceCycle {
  id: string;
  name: string;
  year?: number;
  start_date?: string;
  end_date?: string;
  status?: string | null;
  created_at?: string;
}

export interface PerformanceGoal {
  id: string;
  employee_id: string;
  cycle_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  weight: number | null;
  target_value: number | null;
  actual_value: number | null;
  status: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  employee?: { id: string; first_name: string; last_name: string } | null;
  cycle?: PerformanceCycle | null;
}

export interface PerformanceReview {
  id: string;
  employee_id: string;
  cycle_id: string | null;
  reviewer_id: string | null;
  review_date: string | null;
  overall_rating: number | null;
  strengths: string | null;
  areas_for_improvement: string | null;
  achievements: string | null;
  goals_for_next_period: string | null;
  employee_comments: string | null;
  reviewer_comments: string | null;
  status: string | null;
  submitted_at: string | null;
  acknowledged_at: string | null;
  created_at: string;
  employee?: { id: string; first_name: string; last_name: string; employee_code: string } | null;
  reviewer?: { id: string; first_name: string; last_name: string } | null;
  cycle?: PerformanceCycle | null;
}

export function usePerformanceCycles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cycles = [], isLoading } = useQuery({
    queryKey: ['performance-cycles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_cycles')
        .select('*')
        .order('year', { ascending: false });
      
      if (error) throw error;
      return data as PerformanceCycle[];
    },
  });

  const createCycle = useMutation({
    mutationFn: async (cycle: { name: string; year: number; start_date: string; end_date: string }) => {
      const { data, error } = await supabase
        .from('performance_cycles')
        .insert(cycle)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-cycles'] });
      toast({ title: 'Performance cycle created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating cycle', description: error.message, variant: 'destructive' });
    },
  });

  return { cycles, isLoading, createCycle };
}

export function usePerformanceGoals(employeeId?: string, cycleId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['performance-goals', employeeId, cycleId],
    queryFn: async () => {
      let query = supabase
        .from('performance_goals')
        .select(`
          *,
          employee:employees(id, first_name, last_name),
          cycle:performance_cycles(id, name, year)
        `)
        .order('created_at', { ascending: false });
      
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }
      
      if (cycleId) {
        query = query.eq('cycle_id', cycleId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as PerformanceGoal[];
    },
  });

  const createGoal = useMutation({
    mutationFn: async (goal: {
      employee_id: string;
      cycle_id?: string;
      title: string;
      description?: string;
      category?: string;
      weight?: number;
      target_value?: number;
      due_date?: string;
    }) => {
      const { data, error } = await supabase
        .from('performance_goals')
        .insert(goal)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-goals'] });
      toast({ title: 'Goal created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating goal', description: error.message, variant: 'destructive' });
    },
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PerformanceGoal> & { id: string }) => {
      const { data, error } = await supabase
        .from('performance_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-goals'] });
      toast({ title: 'Goal updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating goal', description: error.message, variant: 'destructive' });
    },
  });

  return { goals, isLoading, createGoal, updateGoal };
}

export function usePerformanceReviews(employeeId?: string, cycleId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['performance-reviews', employeeId, cycleId],
    queryFn: async () => {
      let query = supabase
        .from('performance_reviews')
        .select(`
          *,
          employee:employees!performance_reviews_employee_id_fkey(id, first_name, last_name, employee_code),
          reviewer:employees!performance_reviews_reviewer_id_fkey(id, first_name, last_name),
          cycle:performance_cycles(id, name, year)
        `)
        .order('created_at', { ascending: false });
      
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }
      
      if (cycleId) {
        query = query.eq('cycle_id', cycleId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as PerformanceReview[];
    },
  });

  const createReview = useMutation({
    mutationFn: async (review: {
      employee_id: string;
      cycle_id?: string;
      reviewer_id?: string;
      review_date?: string;
      overall_rating?: number;
      strengths?: string;
      areas_for_improvement?: string;
      achievements?: string;
      goals_for_next_period?: string;
      reviewer_comments?: string;
    }) => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .insert(review)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      toast({ title: 'Review created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating review', description: error.message, variant: 'destructive' });
    },
  });

  const updateReview = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PerformanceReview> & { id: string }) => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      toast({ title: 'Review updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating review', description: error.message, variant: 'destructive' });
    },
  });

  return { reviews, isLoading, createReview, updateReview };
}
