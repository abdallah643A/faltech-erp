import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface Cadence {
  id: string;
  name: string;
  description: string | null;
  target_type: string;
  is_active: boolean;
  created_by: string | null;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CadenceStep {
  id: string;
  cadence_id: string;
  step_order: number;
  delay_days: number;
  action_type: string;
  subject: string;
  description: string | null;
  priority: string | null;
  created_at: string;
}

export interface CadenceEnrollment {
  id: string;
  cadence_id: string;
  lead_id: string | null;
  opportunity_id: string | null;
  current_step: number;
  status: string;
  enrolled_at: string;
  enrolled_by: string | null;
  next_action_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useCadences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: cadences = [], isLoading } = useQuery({
    queryKey: ['cadences', activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('follow_up_cadences')
        .select('*')
        .order('created_at', { ascending: false });
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Cadence[];
    },
    enabled: !!user,
  });

  const { data: steps = [] } = useQuery({
    queryKey: ['cadence-steps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cadence_steps')
        .select('*')
        .order('step_order', { ascending: true });
      if (error) throw error;
      return data as CadenceStep[];
    },
    enabled: !!user,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['cadence-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cadence_enrollments')
        .select('*, follow_up_cadences(name)')
        .order('enrolled_at', { ascending: false });
      if (error) throw error;
      return data as (CadenceEnrollment & { follow_up_cadences: { name: string } | null })[];
    },
    enabled: !!user,
  });

  const createCadence = useMutation({
    mutationFn: async (input: { name: string; description?: string; target_type: string; steps: Omit<CadenceStep, 'id' | 'cadence_id' | 'created_at'>[] }) => {
      const { data: cadence, error } = await supabase
        .from('follow_up_cadences')
        .insert({ name: input.name, description: input.description || null, target_type: input.target_type, created_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) })
        .select()
        .single();
      if (error) throw error;

      if (input.steps.length > 0) {
        const stepsData = input.steps.map(s => ({ ...s, cadence_id: cadence.id }));
        const { error: stepErr } = await supabase.from('cadence_steps').insert(stepsData);
        if (stepErr) throw stepErr;
      }
      return cadence;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadences'] });
      queryClient.invalidateQueries({ queryKey: ['cadence-steps'] });
      toast({ title: 'Cadence Created', description: 'Follow-up sequence is ready' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteCadence = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('follow_up_cadences').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadences'] });
      queryClient.invalidateQueries({ queryKey: ['cadence-steps'] });
      queryClient.invalidateQueries({ queryKey: ['cadence-enrollments'] });
      toast({ title: 'Cadence Deleted' });
    },
  });

  const toggleCadence = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('follow_up_cadences').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cadences'] }),
  });

  const enrollLead = useMutation({
    mutationFn: async ({ cadence_id, lead_id }: { cadence_id: string; lead_id: string }) => {
      const cadenceSteps = steps.filter(s => s.cadence_id === cadence_id).sort((a, b) => a.step_order - b.step_order);
      const firstStep = cadenceSteps[0];
      const nextActionAt = firstStep
        ? new Date(Date.now() + firstStep.delay_days * 24 * 60 * 60 * 1000).toISOString()
        : new Date().toISOString();

      const { error } = await supabase.from('cadence_enrollments').insert({
        cadence_id,
        lead_id,
        current_step: 1,
        status: 'active',
        enrolled_by: user?.id,
        next_action_at: nextActionAt,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadence-enrollments'] });
      toast({ title: 'Lead Enrolled', description: 'Lead added to follow-up sequence' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const cancelEnrollment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cadence_enrollments').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadence-enrollments'] });
      toast({ title: 'Enrollment Cancelled' });
    },
  });

  const pauseEnrollment = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'paused' }) => {
      const { error } = await supabase.from('cadence_enrollments').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cadence-enrollments'] }),
  });

  return {
    cadences, steps, enrollments, isLoading,
    createCadence, deleteCadence, toggleCadence,
    enrollLead, cancelEnrollment, pauseEnrollment,
  };
}
