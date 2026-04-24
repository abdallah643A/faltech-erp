import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { toast } from 'sonner';

export function useSupplierHub() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  const portalAccounts = useQuery({
    queryKey: ['supplier-portal-accounts', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('supplier_portal_accounts' as any).select('*').order('created_at', { ascending: false });
      if (activeCompanyId && activeCompanyId !== 'all') q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const interactions = useQuery({
    queryKey: ['supplier-portal-interactions', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('supplier_portal_interactions' as any).select('*, supplier_portal_accounts(email, contact_name)').order('created_at', { ascending: false }).limit(200);
      if (activeCompanyId && activeCompanyId !== 'all') q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const messages = useQuery({
    queryKey: ['supplier-portal-messages', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('supplier_portal_messages' as any).select('*, supplier_portal_accounts(email, contact_name)').order('created_at', { ascending: false }).limit(200);
      if (activeCompanyId && activeCompanyId !== 'all') q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const reminders = useQuery({
    queryKey: ['supplier-portal-reminders', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('supplier_portal_reminders' as any).select('*, supplier_portal_accounts(email, contact_name)').order('due_date', { ascending: true })) as any;
      if (activeCompanyId && activeCompanyId !== 'all') q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const documents = useQuery({
    queryKey: ['supplier-portal-documents', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('supplier_portal_documents' as any).select('*, supplier_portal_accounts(email, contact_name)').order('expiry_date', { ascending: true })) as any;
      if (activeCompanyId && activeCompanyId !== 'all') q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const rfqResponses = useQuery({
    queryKey: ['supplier-rfq-responses', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('supplier_rfq_responses' as any).select('*').order('created_at', { ascending: false });
      if (activeCompanyId && activeCompanyId !== 'all') q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const poAcknowledgements = useQuery({
    queryKey: ['supplier-po-ack', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('supplier_po_acknowledgements' as any).select('*').order('created_at', { ascending: false });
      if (activeCompanyId && activeCompanyId !== 'all') q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const invoiceSubmissions = useQuery({
    queryKey: ['supplier-invoice-submissions', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('supplier_invoice_submissions' as any).select('*').order('created_at', { ascending: false });
      if (activeCompanyId && activeCompanyId !== 'all') q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const scorecards = useQuery({
    queryKey: ['supplier-scorecards-hub', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('supplier_scorecards' as any).select('*').order('overall_score', { ascending: false })) as any;
      if (activeCompanyId && activeCompanyId !== 'all') q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const createAccount = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from('supplier_portal_accounts' as any).insert({
        ...values,
        company_id: activeCompanyId === 'all' ? null : activeCompanyId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-portal-accounts'] });
      toast.success('Portal account created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendMessage = useMutation({
    mutationFn: async (values: { portal_account_id: string; thread_key: string; message: string; sender_name: string; sender_user_id?: string }) => {
      const { error } = await supabase.from('supplier_portal_messages' as any).insert({
        ...values,
        sender_type: 'internal',
        company_id: activeCompanyId === 'all' ? null : activeCompanyId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-portal-messages'] });
      toast.success('Message sent');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviewRfqResponse = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('supplier_rfq_responses' as any).update({ status, reviewed_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-rfq-responses'] });
      toast.success('Response reviewed');
    },
  });

  const reviewInvoice = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const updates: any = { approval_status: status, reviewed_at: new Date().toISOString() };
      if (reason) updates.rejection_reason = reason;
      const { error } = await supabase.from('supplier_invoice_submissions' as any).update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-invoice-submissions'] });
      toast.success('Invoice reviewed');
    },
  });

  const reviewDocument = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updates: any = { status, reviewed_at: new Date().toISOString() };
      if (notes) updates.review_notes = notes;
      const { error } = await supabase.from('supplier_portal_documents' as any).update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-portal-documents'] });
      toast.success('Document reviewed');
    },
  });

  const createReminder = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from('supplier_portal_reminders' as any).insert({
        ...values,
        company_id: activeCompanyId === 'all' ? null : activeCompanyId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-portal-reminders'] });
      toast.success('Reminder created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateReminder = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await (supabase.from('supplier_portal_reminders' as any).update(updates).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-portal-reminders'] });
      toast.success('Reminder updated');
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await (supabase.from('supplier_portal_accounts' as any).update(updates).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-portal-accounts'] });
      toast.success('Account updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    portalAccounts, interactions, messages, reminders, documents,
    rfqResponses, poAcknowledgements, invoiceSubmissions, scorecards,
    createAccount, updateAccount, sendMessage, reviewRfqResponse, reviewInvoice, reviewDocument,
    createReminder, updateReminder,
  };
}
