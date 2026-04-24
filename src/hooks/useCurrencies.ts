import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Currency {
  code: string;
  name: string;
  name_ar: string | null;
  symbol: string | null;
  decimal_places: number | null;
  is_system_currency: boolean | null;
  is_active: boolean | null;
}

export function useCurrencies() {
  const { data: currencies = [], isLoading } = useQuery({
    queryKey: ['currencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .eq('is_active', true)
        .order('code');
      if (error) throw error;
      return data as Currency[];
    },
  });

  const localCurrency = currencies.find(c => c.is_system_currency) || { code: 'SAR', symbol: '﷼', decimal_places: 2 };

  return { currencies, localCurrency, isLoading };
}
