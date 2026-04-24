import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SAPCompany {
  id: string;
  company_name: string;
  database_name: string;
  service_layer_url: string;
  username: string;
  password: string;
  localization: string | null;
  version: string | null;
  is_active: boolean;
  is_default: boolean;
  default_currency: string;
  created_at: string;
  updated_at: string;
}

export function useSAPCompanies() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['sap-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sap_companies')
        .select('*')
        .eq('is_active', true)
        .order('company_name');
      if (error) throw error;
      return data as SAPCompany[];
    },
  });

  const { data: allCompanies = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['sap-companies-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sap_companies')
        .select('*')
        .order('company_name');
      if (error) throw error;
      return data as SAPCompany[];
    },
  });

  // Get companies assigned to the current user
  const { data: userCompanyIds = [] } = useQuery({
    queryKey: ['user-company-assignments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_company_assignments')
        .select('company_id')
        .eq('user_id', user.id);
      if (error) throw error;
      return data.map(d => d.company_id);
    },
    enabled: !!user?.id,
  });

  const userCompanies = companies.filter(c => userCompanyIds.includes(c.id));

  const profileActiveId = (profile as any)?.active_company_id as string | null | undefined;
  const activeCompany =
    companies.find(c => c.id === profileActiveId) || userCompanies[0] || companies[0] || null;
  const activeCompanyId = activeCompany?.id ?? profileActiveId ?? null;

  const setActiveCompany = useMutation({
    mutationFn: async (companyId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      // Get profile id
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (!prof) throw new Error('Profile not found');
      const { error } = await supabase
        .from('profiles')
        .update({ active_company_id: companyId } as any)
        .eq('id', prof.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-profile'] });
      // Force profile refresh
      window.location.reload();
    },
  });

  const createCompany = useMutation({
    mutationFn: async (company: Omit<SAPCompany, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('sap_companies').insert(company as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sap-companies'] });
      queryClient.invalidateQueries({ queryKey: ['sap-companies-all'] });
      toast({ title: 'Company Added', description: 'SAP company has been added.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const updateCompany = useMutation({
    mutationFn: async ({ id, ...data }: Partial<SAPCompany> & { id: string }) => {
      const { error } = await supabase.from('sap_companies').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sap-companies'] });
      queryClient.invalidateQueries({ queryKey: ['sap-companies-all'] });
      toast({ title: 'Company Updated' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const deleteCompany = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sap_companies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sap-companies'] });
      queryClient.invalidateQueries({ queryKey: ['sap-companies-all'] });
      toast({ title: 'Company Deleted' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  // Assign companies to a specific user (admin action)
  const assignCompanies = async (userId: string, companyIds: string[]) => {
    // Remove existing
    await supabase.from('user_company_assignments').delete().eq('user_id', userId);
    // Add new
    if (companyIds.length > 0) {
      const { error } = await supabase.from('user_company_assignments').insert(
        companyIds.map(company_id => ({ user_id: userId, company_id }))
      );
      if (error) throw error;
    }
    queryClient.invalidateQueries({ queryKey: ['user-company-assignments'] });
  };

  // Get assignments for a specific user (admin)
  const getUserCompanyAssignments = async (userId: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from('user_company_assignments')
      .select('company_id')
      .eq('user_id', userId);
    if (error) throw error;
    return data.map(d => d.company_id);
  };

  return {
    companies,
    allCompanies,
    isLoading,
    isLoadingAll,
    userCompanies,
    activeCompany,
    activeCompanyId,
    setActiveCompany,
    createCompany,
    updateCompany,
    deleteCompany,
    assignCompanies,
    getUserCompanyAssignments,
  };
}
