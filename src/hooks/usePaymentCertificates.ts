import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PaymentCertificateType {
  id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentCertificate {
  id: string;
  certificate_number: string;
  sales_order_id: string;
  certificate_type_id: string;
  amount: number;
  collected_amount: number;
  collection_status: string;
  notes: string | null;
  status: string;
  created_by: string | null;
  notified_user_id: string | null;
  notification_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export function usePaymentCertificateTypes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: types, isLoading } = useQuery({
    queryKey: ['payment-certificate-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_certificate_types')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as PaymentCertificateType[];
    },
  });

  const createType = useMutation({
    mutationFn: async (typeData: { name: string; name_ar?: string; description?: string; sort_order?: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('payment_certificate_types')
        .insert([{ ...typeData, created_by: user?.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-certificate-types'] });
      toast({ title: 'Certificate type created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating certificate type', description: error.message, variant: 'destructive' });
    },
  });

  const updateType = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PaymentCertificateType> & { id: string }) => {
      const { data, error } = await supabase
        .from('payment_certificate_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-certificate-types'] });
      toast({ title: 'Certificate type updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating certificate type', description: error.message, variant: 'destructive' });
    },
  });

  const deleteType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payment_certificate_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-certificate-types'] });
      toast({ title: 'Certificate type deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting certificate type', description: error.message, variant: 'destructive' });
    },
  });

  return { types, isLoading, createType, updateType, deleteType };
}

export function usePaymentCertificates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: certificates, isLoading } = useQuery({
    queryKey: ['payment-certificates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_certificates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PaymentCertificate[];
    },
  });

  const createCertificate = useMutation({
    mutationFn: async (certData: {
      sales_order_id: string;
      certificate_type_id: string;
      amount: number;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate certificate number
      const certNumber = `PC-${Date.now().toString().slice(-6)}`;

      // Get the sales order creator to notify
      const { data: salesOrder } = await supabase
        .from('sales_orders')
        .select('created_by')
        .eq('id', certData.sales_order_id)
        .single();

      const { data, error } = await supabase
        .from('payment_certificates')
        .insert([{
          ...certData,
          certificate_number: certNumber,
          notes: certData.notes || null,
          created_by: user?.id,
          notified_user_id: salesOrder?.created_by || null,
          notification_sent_at: new Date().toISOString(),
          status: 'submitted',
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-certificates'] });
      toast({ title: 'Payment certificate created and notification sent' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating payment certificate', description: error.message, variant: 'destructive' });
    },
  });

  const updateCertificate = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; collected_amount?: number; collection_status?: string; status?: string }) => {
      const { data, error } = await supabase
        .from('payment_certificates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-certificates'] });
      toast({ title: 'Payment certificate updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating certificate', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCertificate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payment_certificates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-certificates'] });
      toast({ title: 'Payment certificate deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting certificate', description: error.message, variant: 'destructive' });
    },
  });

  return { certificates, isLoading, createCertificate, updateCertificate, deleteCertificate };
}
