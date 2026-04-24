import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useCustomerFeedback(filters?: { type?: string; sentiment?: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ['customer-feedback', activeCompanyId, filters],
    queryFn: async () => {
      let q = supabase.from('pos_customer_feedback').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (filters?.type && filters.type !== 'all') q = q.eq('feedback_type', filters.type);
      if (filters?.sentiment && filters.sentiment !== 'all') q = q.eq('sentiment', filters.sentiment);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const submitFeedback = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const sentiment = input.rating >= 4 ? 'positive' : input.rating <= 2 ? 'negative' : 'neutral';
      const { error } = await supabase.from('pos_customer_feedback').insert({
        ...input, sentiment, company_id: activeCompanyId, cashier_id: user?.id,
        is_escalated: input.rating <= 2,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customer-feedback'] }); toast({ title: 'Feedback recorded' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const resolveFeedback = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await supabase.from('pos_customer_feedback').update({
        resolved: true, resolved_at: new Date().toISOString(), resolved_by: user?.id, escalation_notes: notes,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customer-feedback'] }); toast({ title: 'Feedback resolved' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const avgRating = feedback.length ? (feedback.reduce((s, f) => s + (f.rating || 0), 0) / feedback.length).toFixed(1) : '0';
  const stats = {
    total: feedback.length,
    positive: feedback.filter(f => f.sentiment === 'positive').length,
    neutral: feedback.filter(f => f.sentiment === 'neutral').length,
    negative: feedback.filter(f => f.sentiment === 'negative').length,
    avgRating: parseFloat(avgRating),
    escalated: feedback.filter(f => f.is_escalated && !f.resolved).length,
  };

  return { feedback, isLoading, stats, submitFeedback, resolveFeedback };
}
