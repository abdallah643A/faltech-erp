import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface JobPosting {
  id: string;
  title: string;
  department_id: string | null;
  position_id: string | null;
  description: string | null;
  requirements: string | null;
  employment_type: string | null;
  location: string | null;
  salary_range_min: number | null;
  salary_range_max: number | null;
  status: string | null;
  posted_date: string | null;
  closing_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  department?: { id: string; name: string } | null;
  position?: { id: string; title: string } | null;
  applicants_count?: number;
}

export interface JobApplicant {
  id: string;
  job_posting_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  resume_url: string | null;
  cover_letter: string | null;
  status: string | null;
  interview_date: string | null;
  interview_notes: string | null;
  rating: number | null;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function useJobPostings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: postings = [], isLoading } = useQuery({
    queryKey: ['job-postings', activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('job_postings')
        .select('*, department:departments(id, name), position:positions(id, title)')
        .order('created_at', { ascending: false });
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as JobPosting[];
    },
  });

  const createPosting = useMutation({
    mutationFn: async (posting: Partial<JobPosting>) => {
      const { department, position, applicants_count, ...clean } = posting as any;
      const { data, error } = await supabase
        .from('job_postings')
        .insert({ ...clean, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-postings'] });
      toast({ title: 'Job posting created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updatePosting = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<JobPosting> & { id: string }) => {
      const { department, position, applicants_count, ...clean } = updates as any;
      const { data, error } = await supabase
        .from('job_postings')
        .update(clean)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-postings'] });
      toast({ title: 'Job posting updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deletePosting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('job_postings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-postings'] });
      toast({ title: 'Job posting deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return { postings, isLoading, createPosting, updatePosting, deletePosting };
}

export function useJobApplicants(postingId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: applicants = [], isLoading } = useQuery({
    queryKey: ['job-applicants', postingId],
    queryFn: async () => {
      if (!postingId) return [];
      const { data, error } = await supabase
        .from('job_applicants')
        .select('*')
        .eq('job_posting_id', postingId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as JobApplicant[];
    },
    enabled: !!postingId,
  });

  const createApplicant = useMutation({
    mutationFn: async (applicant: Partial<JobApplicant>) => {
      const { data, error } = await supabase
        .from('job_applicants')
        .insert(applicant as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applicants'] });
      toast({ title: 'Applicant added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateApplicant = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<JobApplicant> & { id: string }) => {
      const { data, error } = await supabase
        .from('job_applicants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applicants'] });
      toast({ title: 'Applicant updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return { applicants, isLoading, createApplicant, updateApplicant };
}
