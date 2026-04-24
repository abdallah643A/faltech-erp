import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useHRPolicies() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['hr-policies', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('hr_policies').select('*').order('updated_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const createPolicy = useMutation({
    mutationFn: async (policy: { title: string; category: string; description?: string; content?: string; effective_date?: string; review_date?: string }) => {
      const { data, error } = await supabase.from('hr_policies').insert({
        ...policy,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        created_by: (await supabase.auth.getUser()).data.user?.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-policies'] });
      toast({ title: 'Policy created successfully' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updatePolicy = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('hr_policies').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-policies'] });
      toast({ title: 'Policy updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const publishPolicy = useMutation({
    mutationFn: async ({ id, content, title }: { id: string; content: string; title: string }) => {
      // Get current version
      const { data: current } = await supabase.from('hr_policies').select('version').eq('id', id).single();
      const newVersion = (current?.version || 0) + 1;

      // Save version history
      const userId = (await supabase.auth.getUser()).data.user?.id;
      await supabase.from('hr_policy_versions').insert({
        policy_id: id, version: newVersion, title, content, created_by: userId,
      });

      // Update policy
      const { data, error } = await supabase.from('hr_policies').update({
        status: 'published', version: newVersion, approved_by: userId, approved_at: new Date().toISOString(),
      }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-policies'] });
      toast({ title: 'Policy published' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { policies, isLoading, createPolicy, updatePolicy, publishPolicy };
}

export function usePolicyVersions(policyId?: string) {
  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['policy-versions', policyId],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_policy_versions').select('*').eq('policy_id', policyId!).order('version', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!policyId,
  });
  return { versions, isLoading };
}

export function useComplianceChecklists() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ['compliance-checklists', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('compliance_checklists').select('*, items:compliance_checklist_items(*)').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const createChecklist = useMutation({
    mutationFn: async (checklist: { name: string; description?: string; checklist_type?: string; items: { title: string; description?: string; is_required?: boolean }[] }) => {
      const { items, ...rest } = checklist;
      const { data, error } = await supabase.from('compliance_checklists').insert({
        ...rest,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        created_by: (await supabase.auth.getUser()).data.user?.id,
      }).select().single();
      if (error) throw error;

      if (items.length > 0) {
        const { error: itemError } = await supabase.from('compliance_checklist_items').insert(
          items.map((item, i) => ({ ...item, checklist_id: data.id, sort_order: i }))
        );
        if (itemError) throw itemError;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-checklists'] });
      toast({ title: 'Checklist created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { checklists, isLoading, createChecklist };
}

export function useEmployeeChecklistProgress(employeeId?: string, checklistId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: progress = [], isLoading } = useQuery({
    queryKey: ['checklist-progress', employeeId, checklistId],
    queryFn: async () => {
      let q = supabase.from('employee_checklist_progress').select('*');
      if (employeeId) q = q.eq('employee_id', employeeId);
      if (checklistId) q = q.eq('checklist_id', checklistId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId || !!checklistId,
  });

  const toggleItem = useMutation({
    mutationFn: async ({ employee_id, checklist_id, item_id, completed }: { employee_id: string; checklist_id: string; item_id: string; completed: boolean }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { data, error } = await supabase.from('employee_checklist_progress').upsert({
        employee_id, checklist_id, item_id, completed,
        completed_at: completed ? new Date().toISOString() : null,
        completed_by: completed ? userId : null,
      }, { onConflict: 'employee_id,item_id' }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-progress'] });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { progress, isLoading, toggleItem };
}

export function useHandbookArticles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['handbook-articles', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('handbook_articles').select('*').order('sort_order').order('title');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const createArticle = useMutation({
    mutationFn: async (article: { title: string; category: string; content: string; summary?: string; tags?: string[]; is_published?: boolean }) => {
      const { data, error } = await supabase.from('handbook_articles').insert({
        ...article,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        created_by: (await supabase.auth.getUser()).data.user?.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handbook-articles'] });
      toast({ title: 'Article created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateArticle = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('handbook_articles').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handbook-articles'] });
      toast({ title: 'Article updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { articles, isLoading, createArticle, updateArticle };
}
