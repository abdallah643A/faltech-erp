import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface BankPOSTerminal {
  id: string;
  terminal_id: string;
  terminal_name: string;
  provider: string;
  location: string | null;
  is_active: boolean | null;
  is_mock: boolean | null;
  branch_id: string | null;
  default_currency: string | null;
  warehouse_id: string | null;
  cashier_station: string | null;
  last_transaction_at: string | null;
  connection_status: string | null;
  last_ping_at: string | null;
  terminal_health: string | null;
}

export interface BankPOSPayment {
  id: string;
  transaction_ref: string;
  terminal_id: string | null;
  amount: number;
  currency: string | null;
  status: string;
  card_type: string | null;
  card_last_four: string | null;
  card_scheme: string | null;
  auth_code: string | null;
  rrn: string | null;
  response_code: string | null;
  response_message: string | null;
  receipt_number: string | null;
  source_module: string;
  source_document_id: string | null;
  source_document_number: string | null;
  customer_name: string | null;
  initiated_by_name: string | null;
  completed_at: string | null;
  created_at: string | null;
  provider: string | null;
  provider_transaction_ref: string | null;
  reconciliation_status: string | null;
  branch_id: string | null;
  cashier_name: string | null;
  pos_transaction_id: string | null;
  refund_amount: number | null;
}

export interface InitiatePaymentParams {
  amount: number;
  currency?: string;
  terminal_id?: string;
  source_module: string;
  source_document_id?: string;
  source_document_number?: string;
  customer_name?: string;
  merchant_reference?: string;
  branch_id?: string;
  cashier_id?: string;
  cashier_name?: string;
  idempotency_key?: string;
}

export function useBankPOS() {
  const [terminals, setTerminals] = useState<BankPOSTerminal[]>([]);
  const [payments, setPayments] = useState<BankPOSPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const fetchTerminals = useCallback(async () => {
    let query = supabase.from('bank_pos_terminals').select('*').eq('is_active', true).order('terminal_name');
    if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
    const { data, error } = await query;
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setTerminals((data || []) as any);
  }, [activeCompanyId]);

  const fetchPayments = useCallback(async (filters?: { source_module?: string; source_document_id?: string; reconciliation_status?: string }) => {
    let query = supabase.from('bank_pos_payments').select('*').order('created_at', { ascending: false }).limit(200);
    if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
    if (filters?.source_module) query = query.eq('source_module', filters.source_module);
    if (filters?.source_document_id) query = query.eq('source_document_id', filters.source_document_id);
    if (filters?.reconciliation_status) query = query.eq('reconciliation_status', filters.reconciliation_status);
    const { data, error } = await query;
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setPayments((data || []) as any);
  }, [activeCompanyId]);

  const initiatePayment = async (params: InitiatePaymentParams): Promise<BankPOSPayment | null> => {
    setLoading(true);
    try {
      const idempotencyKey = params.idempotency_key || `${params.source_module}-${params.amount}-${Date.now()}`;
      const response = await supabase.functions.invoke('geidea-pos', {
        body: { ...params, idempotency_key: idempotencyKey, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) },
      });
      if (response.error) throw response.error;
      const result = response.data;
      if (result.duplicate) {
        toast({ title: 'Duplicate Payment', description: 'This payment was already processed', variant: 'default' });
        return result.transaction as BankPOSPayment;
      }
      if (!result.success) throw new Error(result.error || 'Payment failed');
      toast({
        title: result.mock ? '✅ Mock Payment Approved' : '✅ Payment Approved',
        description: `${params.amount} ${params.currency || 'SAR'} – ${result.transaction?.card_type || 'Card'} ****${result.transaction?.card_last_four || '****'}`,
      });
      return result.transaction as BankPOSPayment;
    } catch (err: any) {
      toast({ title: 'Payment Failed', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const cancelPayment = async (id: string) => {
    try {
      const response = await supabase.functions.invoke('geidea-pos?action=cancel', { body: { id } });
      if (response.error) throw response.error;
      toast({ title: 'Payment cancelled' });
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return false;
    }
  };

  const refundPayment = async (params: { original_payment_id: string; refund_amount: number; reason?: string }) => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('geidea-pos?action=refund', { body: params });
      if (response.error) throw response.error;
      const result = response.data;
      if (!result.success) throw new Error(result.error || 'Refund failed');
      toast({ title: '✅ Refund Processed', description: `${params.refund_amount} SAR refunded` });
      return result.refund;
    } catch (err: any) {
      toast({ title: 'Refund Failed', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const subscribeToPayment = (paymentId: string, onUpdate: (payment: BankPOSPayment) => void) => {
    const channel = supabase
      .channel(`pos-payment-${paymentId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bank_pos_payments', filter: `id=eq.${paymentId}` }, (payload) => {
        onUpdate(payload.new as any);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const pingTerminal = async (terminalId: string) => {
    try {
      const response = await supabase.functions.invoke('geidea-pos?action=ping', { body: { terminal_id: terminalId } });
      if (response.error) throw response.error;
      toast({ title: 'Terminal Online' });
      await fetchTerminals();
    } catch {
      toast({ title: 'Terminal Offline', variant: 'destructive' });
    }
  };

  useEffect(() => { fetchTerminals(); }, [fetchTerminals]);

  return {
    terminals, payments, loading,
    fetchTerminals, fetchPayments,
    initiatePayment, cancelPayment, refundPayment,
    subscribeToPayment, pingTerminal,
  };
}
