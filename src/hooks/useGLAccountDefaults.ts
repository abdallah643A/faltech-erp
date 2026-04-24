import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useToast } from '@/hooks/use-toast';
import type { GLDefault } from '@/services/sapPostingEngine';

export function useGLAccountDefaults() {
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: defaults = [], isLoading } = useQuery({
    queryKey: ['gl-account-defaults', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('gl_account_defaults' as any).select('*');
      if (activeCompanyId) {
        q = (q as any).or(`company_id.eq.${activeCompanyId},company_id.is.null`);
      }
      const { data, error } = await (q as any).order('functional_area').order('account_type');
      if (error) throw error;
      return data as GLDefault[];
    },
  });

  const updateDefault = useMutation({
    mutationFn: async (input: { id: string; acct_code: string; acct_name?: string }) => {
      const { error } = await (supabase.from('gl_account_defaults' as any).update({
        acct_code: input.acct_code,
        acct_name: input.acct_name || null,
      }) as any).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gl-account-defaults'] });
      toast({ title: 'Account Updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['coa-accounts-for-gl'],
    queryFn: async () => {
      const { data } = await supabase
        .from('chart_of_accounts')
        .select('acct_code, acct_name, acct_type, is_active')
        .eq('is_active', true)
        .order('acct_code');
      return data || [];
    },
  });

  return { defaults, isLoading, updateDefault, accounts };
}
