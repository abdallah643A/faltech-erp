import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface Quote {
  id: string;
  quote_number: number;
  opportunity_id: string | null;
  customer_id: string | null;
  customer_code: string;
  customer_name: string;
  customer_phone: string | null;
  status: string;
  valid_until: string | null;
  subtotal: number;
  discount_percent: number | null;
  discount_amount: number | null;
  tax_amount: number | null;
  total: number;
  notes: string | null;
  currency: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // SAP B1 fields
  branch_id: string | null;
  sap_doc_entry: string | null;
  sync_status: string | null;
  last_synced_at: string | null;
  doc_date: string | null;
  contact_person: string | null;
  sales_employee_code: number | null;
  num_at_card: string | null;
  posting_date: string | null;
  shipping_address: string | null;
  billing_address: string | null;
  payment_terms: string | null;
  shipping_method: string | null;
  sales_rep_id: string | null;
  series: number | null;
}

export interface QuoteLine {
  id: string;
  quote_id: string;
  line_num: number;
  item_id: string | null;
  item_code: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number | null;
  tax_percent: number | null;
  line_total: number;
  created_at: string;
}

export type QuoteInsert = Omit<Quote, 'id' | 'quote_number' | 'created_at' | 'updated_at' | 'branch_id' | 'sap_doc_entry' | 'sync_status' | 'last_synced_at' | 'doc_date' | 'contact_person' | 'sales_employee_code' | 'num_at_card' | 'posting_date' | 'shipping_address' | 'billing_address' | 'payment_terms' | 'shipping_method' | 'sales_rep_id' | 'customer_phone'> & {
  branch_id?: string | null;
  sap_doc_entry?: string | null;
  sync_status?: string | null;
  last_synced_at?: string | null;
  doc_date?: string | null;
  contact_person?: string | null;
  sales_employee_code?: number | null;
  num_at_card?: string | null;
  posting_date?: string | null;
  shipping_address?: string | null;
  billing_address?: string | null;
  payment_terms?: string | null;
  shipping_method?: string | null;
  sales_rep_id?: string | null;
  customer_phone?: string | null;
  series?: number | null;
};
export type QuoteUpdate = Partial<QuoteInsert>;
export type QuoteLineInsert = Omit<QuoteLine, 'id' | 'created_at'>;

export function useQuotes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: quotes = [], isLoading, error } = useQuery({
    queryKey: ['quotes', activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (activeCompanyId) {
        query = query.eq('company_id', activeCompanyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Quote[];
    },
    enabled: !!user,
  });

  const createQuote = useMutation({
    mutationFn: async (quote: QuoteInsert) => {
      const { data, error } = await supabase
        .from('quotes')
        .insert({
          ...quote,
          created_by: user?.id,
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast({
        title: 'Success',
        description: 'Quote created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateQuote = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & QuoteUpdate) => {
      const { data, error } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast({
        title: 'Success',
        description: 'Quote updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteQuote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast({
        title: 'Deleted',
        description: 'Quote deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    quotes,
    isLoading,
    error,
    createQuote,
    updateQuote,
    deleteQuote,
  };
}

export function useQuoteLines(quoteId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['quote-lines', quoteId],
    queryFn: async () => {
      if (!quoteId) return [];
      const { data, error } = await supabase
        .from('quote_lines')
        .select('*')
        .eq('quote_id', quoteId)
        .order('line_num', { ascending: true });
      
      if (error) throw error;
      return data as QuoteLine[];
    },
    enabled: !!user && !!quoteId,
  });

  const addLine = useMutation({
    mutationFn: async (line: QuoteLineInsert) => {
      const { data, error } = await supabase
        .from('quote_lines')
        .insert(line)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-lines', quoteId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateLine = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<QuoteLineInsert>) => {
      const { data, error } = await supabase
        .from('quote_lines')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-lines', quoteId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteLine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quote_lines')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-lines', quoteId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    lines,
    isLoading,
    addLine,
    updateLine,
    deleteLine,
  };
}
