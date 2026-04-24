import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface BusinessPartner {
  id: string;
  card_code: string;
  card_name: string;
  card_type: string;
  email: string | null;
  phone: string | null;
  status: string | null;
}

export function useBusinessPartners() {
  const { activeCompanyId } = useActiveCompany();

  const { data: businessPartners = [], isLoading, error } = useQuery({
    queryKey: ['business-partners-list', activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('business_partners')
        .select('id, card_code, card_name, card_type, email, phone, status')
        .eq('status', 'active')
        .order('card_name', { ascending: true });
      
      if (activeCompanyId) {
        query = query.eq('company_id', activeCompanyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as BusinessPartner[];
    },
  });

  return {
    businessPartners,
    isLoading,
    error,
  };
}
