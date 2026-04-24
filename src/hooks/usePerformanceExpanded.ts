import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CompetencyDefinition {
  id: string;
  name: string;
  category: string;
  description: string | null;
  max_level: number;
  is_active: boolean;
  created_at: string;
}

export interface CompetencyAssessment {
  id: string;
  employee_id: string;
  competency_id: string;
  cycle_id: string | null;
  assessed_by: string | null;
  level: number;
  notes: string | null;
  assessed_at: string | null;
  created_at: string;
  competency?: CompetencyDefinition | null;
  employee?: { id: string; first_name: string; last_name: string } | null;
  assessor?: { id: string; first_name: string; last_name: string } | null;
}

export interface PerformanceFeedback {
  id: string;
  review_id: string | null;
  employee_id: string;
  feedback_from_id: string;
  relationship: string;
  rating: number | null;
  strengths: string | null;
  improvements: string | null;
  comments: string | null;
  is_anonymous: boolean;
  status: string;
  submitted_at: string | null;
  created_at: string;
  employee?: { id: string; first_name: string; last_name: string } | null;
  feedback_from?: { id: string; first_name: string; last_name: string } | null;
}

export function useCompetencyDefinitions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: competencies = [], isLoading } = useQuery({
    queryKey: ['competency-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competency_definitions')
        .select('*')
        .order('category', { ascending: true });
      if (error) throw error;
      return data as CompetencyDefinition[];
    },
  });

  const createCompetency = useMutation({
    mutationFn: async (comp: { name: string; category: string; description?: string; max_level?: number }) => {
      const { data, error } = await supabase.from('competency_definitions').insert(comp).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competency-definitions'] });
      toast({ title: 'Competency created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { competencies, isLoading, createCompetency };
}

export function useCompetencyAssessments(employeeId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['competency-assessments', employeeId],
    queryFn: async () => {
      let query = supabase
        .from('competency_assessments')
        .select(`
          *,
          competency:competency_definitions(*),
          employee:employees!competency_assessments_employee_id_fkey(id, first_name, last_name),
          assessor:employees!competency_assessments_assessed_by_fkey(id, first_name, last_name)
        `)
        .order('created_at', { ascending: false });
      if (employeeId) query = query.eq('employee_id', employeeId);
      const { data, error } = await query;
      if (error) throw error;
      return data as CompetencyAssessment[];
    },
  });

  const createAssessment = useMutation({
    mutationFn: async (a: { employee_id: string; competency_id: string; level: number; cycle_id?: string; assessed_by?: string; notes?: string }) => {
      const { data, error } = await supabase.from('competency_assessments').insert(a).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competency-assessments'] });
      toast({ title: 'Assessment saved' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { assessments, isLoading, createAssessment };
}

export function usePerformanceFeedback(employeeId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ['performance-feedback', employeeId],
    queryFn: async () => {
      let query = supabase
        .from('performance_feedback')
        .select(`
          *,
          employee:employees!performance_feedback_employee_id_fkey(id, first_name, last_name),
          feedback_from:employees!performance_feedback_feedback_from_id_fkey(id, first_name, last_name)
        `)
        .order('created_at', { ascending: false });
      if (employeeId) query = query.eq('employee_id', employeeId);
      const { data, error } = await query;
      if (error) throw error;
      return data as PerformanceFeedback[];
    },
  });

  const createFeedback = useMutation({
    mutationFn: async (fb: {
      employee_id: string;
      feedback_from_id: string;
      relationship: string;
      review_id?: string;
      rating?: number;
      strengths?: string;
      improvements?: string;
      comments?: string;
      is_anonymous?: boolean;
    }) => {
      const { data, error } = await supabase.from('performance_feedback').insert(fb).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-feedback'] });
      toast({ title: 'Feedback submitted' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const submitFeedback = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('performance_feedback')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-feedback'] });
      toast({ title: 'Feedback submitted' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { feedback, isLoading, createFeedback, submitFeedback };
}
