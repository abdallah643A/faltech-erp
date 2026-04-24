import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useSupplierSites() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: supplierSites = [], isLoading } = useQuery({
    queryKey: ['supplier-sites', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('supplier_sites' as any).select('*').order('vendor_name') as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createSupplierSite = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from('supplier_sites' as any).insert({
        ...data,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-sites'] });
      toast({ title: 'Supplier site mapping created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateSupplierSite = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await (supabase.from('supplier_sites' as any).update(data).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-sites'] });
      toast({ title: 'Supplier site updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteSupplierSite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('supplier_sites' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-sites'] });
      toast({ title: 'Supplier site mapping removed' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { supplierSites, isLoading, createSupplierSite, updateSupplierSite, deleteSupplierSite };
}

export function useDeliveryVerifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: verifications = [], isLoading } = useQuery({
    queryKey: ['delivery-verifications', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('supplier_delivery_verifications' as any).select('*').order('verification_date', { ascending: false }) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createVerification = useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await (supabase.from('supplier_delivery_verifications' as any).insert({
        ...data,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }).select().single() as any);
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-verifications'] });
      toast({ title: 'Delivery verification recorded' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { verifications, isLoading, createVerification };
}

export function useSupplierIssues() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['supplier-issues', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('supplier_site_issues' as any).select('*').order('reported_date', { ascending: false }) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createIssue = useMutation({
    mutationFn: async (data: any) => {
      const issueNumber = 'SI-' + String(Date.now()).slice(-8);
      const { error } = await (supabase.from('supplier_site_issues' as any).insert({
        ...data,
        issue_number: issueNumber,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-issues'] });
      toast({ title: 'Issue reported' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateIssue = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await (supabase.from('supplier_site_issues' as any).update(data).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-issues'] });
      toast({ title: 'Issue updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { issues, isLoading, createIssue, updateIssue };
}

export function useSupplierSiteRatings() {
  const { activeCompanyId } = useActiveCompany();

  const { data: ratings = [], isLoading } = useQuery({
    queryKey: ['supplier-site-ratings', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('supplier_site_ratings' as any).select('*').order('overall_score', { ascending: false }) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  return { ratings, isLoading };
}

export function useSupplierPhotoUpload() {
  const upload = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `issues/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('supplier-photos').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('supplier-photos').getPublicUrl(path);
    return data.publicUrl;
  };
  return { upload };
}
