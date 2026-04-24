import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface OnboardingApp {
  id: string;
  vendor_id: string | null;
  legal_name: string;
  trade_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  category: string | null;
  country: string | null;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'active';
  current_step: number;
  total_steps: number;
  answers: Record<string, any>;
  documents: Array<{ name: string; url: string; uploaded_at: string }>;
  qualification_score: number | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface OnboardingQuestion {
  id: string;
  category: string;
  question_en: string;
  question_ar: string | null;
  answer_type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'file';
  options: any;
  weight: number;
  is_required: boolean;
  sort_order: number;
}

export function useSupplierOnboarding(filterStatus?: OnboardingApp['status']) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const apps = useQuery({
    queryKey: ['supplier-onboarding', activeCompanyId, filterStatus ?? 'all'],
    queryFn: async () => {
      let q: any = supabase.from('supplier_onboarding_applications' as any).select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (filterStatus) q = q.eq('status', filterStatus);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as OnboardingApp[];
    },
  });

  const questions = useQuery({
    queryKey: ['supplier-onboarding-questions', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('supplier_onboarding_questions' as any)
        .select('*').eq('is_active', true).order('sort_order') as any);
      if (error) throw error;
      return (data || []) as OnboardingQuestion[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: Partial<OnboardingApp>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase.from('supplier_onboarding_applications' as any).insert({
        ...input,
        created_by: user?.id,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }).select().single() as any);
      if (error) throw error;
      return data as OnboardingApp;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-onboarding'] });
      toast({ title: 'Onboarding draft created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<OnboardingApp> & { id: string }) => {
      const { error } = await (supabase.from('supplier_onboarding_applications' as any)
        .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplier-onboarding'] }),
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const submit = useMutation({
    mutationFn: async ({ id, answers, score }: { id: string; answers: Record<string, any>; score: number }) => {
      const { error } = await (supabase.from('supplier_onboarding_applications' as any).update({
        answers, qualification_score: score, status: 'submitted',
        submitted_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-onboarding'] });
      toast({ title: 'Application submitted for review' });
    },
  });

  const review = useMutation({
    mutationFn: async ({ id, decision, reason }: { id: string; decision: 'approved' | 'rejected'; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from('supplier_onboarding_applications' as any).update({
        status: decision,
        reviewer_id: user?.id,
        reviewed_at: new Date().toISOString(),
        approved_at: decision === 'approved' ? new Date().toISOString() : null,
        rejection_reason: decision === 'rejected' ? (reason || null) : null,
      }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-onboarding'] });
      toast({ title: 'Decision recorded' });
    },
  });

  return { apps, questions, create, update, submit, review };
}
