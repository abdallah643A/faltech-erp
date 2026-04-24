import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface DocumentExpiryRecord {
  id: string;
  company_id: string | null;
  document_type: string;
  document_name: string;
  document_number: string | null;
  description: string | null;
  issue_date: string | null;
  expiry_date: string;
  renewal_date: string | null;
  status: string;
  urgency: string;
  owner_user_id: string | null;
  owner_name: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  related_entity_name: string | null;
  reminder_days: number[] | null;
  last_reminder_sent_at: string | null;
  auto_renew: boolean;
  attachment_url: string | null;
  notes: string | null;
  metadata: Record<string, any> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RenewalHistoryItem {
  id: string;
  document_id: string;
  previous_expiry_date: string | null;
  new_expiry_date: string;
  renewal_cost: number | null;
  renewal_notes: string | null;
  attachment_url: string | null;
  renewed_by: string | null;
  renewed_by_name: string | null;
  created_at: string;
}

export type DocumentType = 'contract' | 'license' | 'certificate' | 'employee_id' | 'visa' | 'insurance' | 'equipment_permit' | 'vendor_registration' | 'project_approval' | 'other';

export const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'contract', label: 'Contract' },
  { value: 'license', label: 'License' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'employee_id', label: 'Employee ID' },
  { value: 'visa', label: 'Visa' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'equipment_permit', label: 'Equipment Permit' },
  { value: 'vendor_registration', label: 'Vendor Registration' },
  { value: 'project_approval', label: 'Project Approval' },
  { value: 'other', label: 'Other' },
];

export function useDocumentExpiry(filters?: { type?: string; urgency?: string; status?: string }) {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['document-expiry-records', activeCompanyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('document_expiry_records')
        .select('*')
        .order('expiry_date', { ascending: true });

      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      if (filters?.type && filters.type !== 'all') query = query.eq('document_type', filters.type);
      if (filters?.urgency && filters.urgency !== 'all') query = query.eq('urgency', filters.urgency);
      if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as DocumentExpiryRecord[];
    },
    enabled: !!user,
  });

  const stats = {
    total: records.length,
    expired: records.filter(r => r.urgency === 'expired').length,
    critical: records.filter(r => r.urgency === 'critical').length,
    warning: records.filter(r => r.urgency === 'warning').length,
    attention: records.filter(r => r.urgency === 'attention').length,
    normal: records.filter(r => r.urgency === 'normal').length,
    autoRenew: records.filter(r => r.auto_renew).length,
  };

  const createRecord = useMutation({
    mutationFn: async (record: Partial<DocumentExpiryRecord>) => {
      const { error } = await supabase
        .from('document_expiry_records')
        .insert({
          ...record,
          company_id: activeCompanyId,
          created_by: user?.id,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document-expiry-records'] }),
  });

  const updateRecord = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DocumentExpiryRecord> & { id: string }) => {
      const { error } = await supabase
        .from('document_expiry_records')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document-expiry-records'] }),
  });

  const deleteRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('document_expiry_records')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['document-expiry-records'] }),
  });

  const renewDocument = useMutation({
    mutationFn: async ({ documentId, newExpiryDate, renewalCost, renewalNotes, attachmentUrl }: {
      documentId: string;
      newExpiryDate: string;
      renewalCost?: number;
      renewalNotes?: string;
      attachmentUrl?: string;
    }) => {
      const record = records.find(r => r.id === documentId);

      // Insert renewal history
      const { error: histError } = await supabase
        .from('document_renewal_history')
        .insert({
          document_id: documentId,
          previous_expiry_date: record?.expiry_date,
          new_expiry_date: newExpiryDate,
          renewal_cost: renewalCost,
          renewal_notes: renewalNotes,
          attachment_url: attachmentUrl,
          renewed_by: user?.id,
          renewed_by_name: user?.email,
        } as any);
      if (histError) throw histError;

      // Update the record
      const { error } = await supabase
        .from('document_expiry_records')
        .update({
          expiry_date: newExpiryDate,
          renewal_date: new Date().toISOString().split('T')[0],
          status: 'renewed',
        } as any)
        .eq('id', documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-expiry-records'] });
      queryClient.invalidateQueries({ queryKey: ['document-renewal-history'] });
    },
  });

  return {
    records,
    isLoading,
    stats,
    createRecord,
    updateRecord,
    deleteRecord,
    renewDocument,
  };
}

export function useRenewalHistory(documentId: string | null) {
  return useQuery({
    queryKey: ['document-renewal-history', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_renewal_history')
        .select('*')
        .eq('document_id', documentId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as RenewalHistoryItem[];
    },
    enabled: !!documentId,
  });
}
