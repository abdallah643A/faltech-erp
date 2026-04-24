import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useSupplierReviews(supplierId?: string) {
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['supplier-reviews', supplierId, activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('supplier_reviews' as any).select('*').order('review_date', { ascending: false }) as any);
      if (supplierId) q = q.eq('supplier_id', supplierId);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createReview = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from('supplier_reviews' as any).insert({
        ...data,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['business-partners'] });
      toast({ title: 'Performance review saved' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { reviews, isLoading, createReview };
}

export function useSupplierRFQs() {
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rfqs = [], isLoading } = useQuery({
    queryKey: ['supplier-rfqs', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('supplier_rfqs' as any).select('*').order('created_at', { ascending: false }) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createRFQ = useMutation({
    mutationFn: async (data: any) => {
      const rfqNumber = 'RFQ-' + String(Date.now()).slice(-8);
      const { data: result, error } = await (supabase.from('supplier_rfqs' as any).insert({
        ...data,
        rfq_number: rfqNumber,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }).select().single() as any);
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-rfqs'] });
      toast({ title: 'RFQ created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateRFQ = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await (supabase.from('supplier_rfqs' as any).update(data).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-rfqs'] });
      toast({ title: 'RFQ updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { rfqs, isLoading, createRFQ, updateRFQ };
}

export function useRFQResponses(rfqId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: responses = [], isLoading } = useQuery({
    queryKey: ['rfq-responses', rfqId],
    enabled: !!rfqId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('supplier_rfq_responses' as any)
        .select('*').eq('rfq_id', rfqId).order('created_at') as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const createResponse = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from('supplier_rfq_responses' as any).insert(data) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfq-responses'] });
      toast({ title: 'Response recorded' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateResponse = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await (supabase.from('supplier_rfq_responses' as any).update(data).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfq-responses'] });
      toast({ title: 'Response updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { responses, isLoading, createResponse, updateResponse };
}

export function useSupplierMetrics() {
  const { activeCompanyId } = useActiveCompany();

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['supplier-metrics', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('business_partners')
        .select('id, card_code, card_name, card_type, overall_rating, on_time_delivery_rate, quality_score, price_competitiveness, communication_score, total_purchase_value, total_purchase_count, average_lead_time_days, last_performance_review_date, status, industry')
        .eq('card_type', 'vendor')
        .eq('status', 'active')
        .order('overall_rating', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  return { vendors, isLoading };
}
