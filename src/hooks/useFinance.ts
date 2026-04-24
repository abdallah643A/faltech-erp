import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface FinanceAlert {
  id: string;
  sales_order_id: string | null;
  project_id: string | null;
  alert_type: string;
  title: string;
  description: string | null;
  priority: string | null;
  status: string | null;
  assigned_to: string | null;
  created_by: string | null;
  read_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  sales_order?: {
    doc_num: number;
    customer_name: string;
    contract_number: string | null;
    contract_value: number | null;
    total: number | null;
  };
}

export interface PaymentVerification {
  id: string;
  sales_order_id: string;
  project_id: string | null;
  payment_term_number: number;
  payment_type: string | null;
  expected_amount: number | null;
  verified_amount: number | null;
  verification_status: string | null;
  payment_date: string | null;
  payment_reference: string | null;
  payment_method: string | null;
  bank_name: string | null;
  bank_account: string | null;
  confirmation_document_url: string | null;
  notes: string | null;
  verified_by: string | null;
  verified_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  sales_order?: {
    doc_num: number;
    customer_name: string;
    contract_number: string | null;
  };
}

export interface FinancialClearance {
  id: string;
  sales_order_id: string;
  project_id: string | null;
  clearance_type: string | null;
  status: string | null;
  total_contract_value: number | null;
  total_received: number | null;
  outstanding_amount: number | null;
  clearance_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  sales_order?: {
    doc_num: number;
    customer_name: string;
    contract_number: string | null;
    contract_value: number | null;
  };
}

export function useFinanceAlerts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['finance-alerts', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_alerts')
        .select(`
          *,
          sales_order:sales_orders(doc_num, customer_name, contract_number, contract_value, total)
        `)
        .neq('alert_type', 'technical_assessment')
        .neq('alert_type', 'design_costing')
        .neq('alert_type', 'cost_variance_sales')
        .neq('alert_type', 'manufacturing_start')
        .neq('alert_type', 'final_payment_sales')
        .neq('alert_type', 'procurement_start')
        .neq('alert_type', 'installation_ready')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FinanceAlert[];
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('finance_alerts')
        .update({ read_at: new Date().toISOString() })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-alerts'] });
    },
  });

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('finance_alerts')
        .update({ 
          status: 'resolved', 
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id 
        })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-alerts'] });
      toast({ title: 'Alert resolved' });
    },
  });

  const pendingAlerts = alerts?.filter(a => a.status === 'pending') || [];
  const resolvedAlerts = alerts?.filter(a => a.status === 'resolved') || [];

  return {
    alerts,
    pendingAlerts,
    resolvedAlerts,
    isLoading,
    markAsRead,
    resolveAlert,
  };
}

export function usePaymentVerifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: verifications, isLoading } = useQuery({
    queryKey: ['payment-verifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_verifications')
        .select(`
          *,
          sales_order:sales_orders(doc_num, customer_name, contract_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PaymentVerification[];
    },
  });

  const verifyPayment = useMutation({
    mutationFn: async ({ 
      id, 
      verified_amount, 
      payment_date, 
      payment_reference, 
      payment_method,
      bank_name,
      notes 
    }: {
      id: string;
      verified_amount: number;
      payment_date?: string;
      payment_reference?: string;
      payment_method?: string;
      bank_name?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('payment_verifications')
        .update({
          verified_amount,
          payment_date: payment_date || new Date().toISOString().split('T')[0],
          payment_reference,
          payment_method,
          bank_name,
          notes,
          verification_status: 'verified',
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['financial-clearances'] });
      toast({ title: 'Payment verified successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error verifying payment', description: error.message, variant: 'destructive' });
    },
  });

  const rejectPayment = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('payment_verifications')
        .update({
          verification_status: 'rejected',
          rejected_by: user?.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-verifications'] });
      toast({ title: 'Payment rejected' });
    },
  });

  const uploadConfirmation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `payment-confirmations/${id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from('project-documents')
        .createSignedUrl(fileName, 3600 * 24 * 365);

      const { error } = await supabase
        .from('payment_verifications')
        .update({ confirmation_document_url: urlData?.signedUrl || fileName })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-verifications'] });
      toast({ title: 'Confirmation document uploaded' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error uploading document', description: error.message, variant: 'destructive' });
    },
  });

  const pendingVerifications = verifications?.filter(v => v.verification_status === 'pending') || [];
  const verifiedPayments = verifications?.filter(v => v.verification_status === 'verified') || [];

  return {
    verifications,
    pendingVerifications,
    verifiedPayments,
    isLoading,
    verifyPayment,
    rejectPayment,
    uploadConfirmation,
  };
}

export function useFinancialClearances() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clearances, isLoading } = useQuery({
    queryKey: ['financial-clearances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_clearances')
        .select(`
          *,
          sales_order:sales_orders(doc_num, customer_name, contract_number, contract_value)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FinancialClearance[];
    },
  });

  const approveClearance = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await supabase.rpc('approve_financial_clearance', {
        p_clearance_id: id,
        p_notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-clearances'] });
      queryClient.invalidateQueries({ queryKey: ['finance-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Financial clearance approved', description: 'Project has progressed to next phase' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error approving clearance', description: error.message, variant: 'destructive' });
    },
  });

  const rejectClearance = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase.rpc('reject_financial_clearance', {
        p_clearance_id: id,
        p_reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-clearances'] });
      queryClient.invalidateQueries({ queryKey: ['finance-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      toast({ title: 'Financial clearance rejected' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error rejecting clearance', description: error.message, variant: 'destructive' });
    },
  });

  const updateReceived = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const clearance = clearances?.find(c => c.id === id);
      const newTotal = (clearance?.total_received || 0) + amount;
      const outstanding = (clearance?.total_contract_value || 0) - newTotal;

      const { error } = await supabase
        .from('financial_clearances')
        .update({
          total_received: newTotal,
          outstanding_amount: outstanding,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-clearances'] });
      toast({ title: 'Payment recorded' });
    },
  });

  const pendingClearances = clearances?.filter(c => c.status === 'pending') || [];
  const approvedClearances = clearances?.filter(c => c.status === 'approved') || [];

  return {
    clearances,
    pendingClearances,
    approvedClearances,
    isLoading,
    approveClearance,
    rejectClearance,
    updateReceived,
  };
}

export function useFinanceStats() {
  const { clearances } = useFinancialClearances();
  const { pendingAlerts } = useFinanceAlerts();
  const { pendingVerifications } = usePaymentVerifications();

  const totalContractValue = clearances?.reduce((sum, c) => sum + (c.total_contract_value || 0), 0) || 0;
  const totalReceived = clearances?.reduce((sum, c) => sum + (c.total_received || 0), 0) || 0;
  const totalOutstanding = clearances?.reduce((sum, c) => sum + (c.outstanding_amount || 0), 0) || 0;
  const pendingClearancesCount = clearances?.filter(c => c.status === 'pending').length || 0;

  return {
    totalContractValue,
    totalReceived,
    totalOutstanding,
    pendingAlertsCount: pendingAlerts.length,
    pendingVerificationsCount: pendingVerifications.length,
    pendingClearancesCount,
  };
}
