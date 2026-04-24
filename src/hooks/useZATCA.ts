import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface ZATCASettings {
  id?: string;
  organization_name: string;
  organization_name_ar?: string;
  vat_number: string;
  cr_number?: string;
  street?: string;
  building_number?: string;
  city?: string;
  district?: string;
  postal_code?: string;
  country_code?: string;
  environment: string;
  api_base_url?: string;
  compliance_csid?: string;
  production_csid?: string;
  is_active?: boolean;
}

export interface ZATCASubmission {
  id: string;
  document_type: string;
  document_id: string;
  document_number?: string;
  invoice_type: string;
  invoice_sub_type?: string;
  uuid: string;
  invoice_hash?: string;
  qr_code?: string;
  submission_type: string;
  status: string;
  zatca_status?: string;
  zatca_clearing_status?: string;
  zatca_reporting_status?: string;
  validation_results?: any;
  warning_messages?: any;
  error_messages?: any;
  submitted_at?: string;
  cleared_at?: string;
  retry_count?: number;
  created_at?: string;
}

export interface ZATCALog {
  id: string;
  submission_id?: string;
  action: string;
  request_url?: string;
  response_status?: number;
  response_body?: string;
  error_message?: string;
  duration_ms?: number;
  created_at?: string;
}

export function useZATCA() {
  const [settings, setSettings] = useState<ZATCASettings | null>(null);
  const [submissions, setSubmissions] = useState<ZATCASubmission[]>([]);
  const [logs, setLogs] = useState<ZATCALog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const fetchSettings = async () => {
    let query = supabase
      .from('zatca_settings')
      .select('*')
      .eq('is_active', true);
    if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
    const { data } = await query.maybeSingle();
    setSettings(data as ZATCASettings | null);
  };

  const fetchSubmissions = async () => {
    const { data } = await supabase
      .from('zatca_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setSubmissions((data || []) as ZATCASubmission[]);
  };

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('zatca_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setLogs((data || []) as ZATCALog[]);
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchSettings(), fetchSubmissions(), fetchLogs()]);
    setLoading(false);
  };

  const saveSettings = async (s: Partial<ZATCASettings>) => {
    try {
      const payload = { ...s, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) };
      if (settings?.id) {
        const { error } = await supabase.from('zatca_settings').update(payload).eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('zatca_settings').insert(payload as any);
        if (error) throw error;
      }
      toast({ title: 'Settings saved' });
      await fetchSettings();
      return true;
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  const callZATCA = async (action: string, params: Record<string, any> = {}) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(`https://${projectId}.supabase.co/functions/v1/zatca-integration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action, ...params }),
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'ZATCA API error');
      return result;
    } catch (e: any) {
      toast({ title: 'ZATCA Error', description: e.message, variant: 'destructive' });
      throw e;
    }
  };

  const generateXML = async (documentType: string, documentId: string) => {
    const result = await callZATCA('generate_invoice_xml', { document_type: documentType, document_id: documentId });
    toast({ title: 'XML Generated', description: `Invoice UUID: ${result.submission?.uuid?.substring(0, 8)}...` });
    await fetchSubmissions();
    return result;
  };

  const submitClearance = async (submissionId: string) => {
    const result = await callZATCA('submit_clearance', { submission_id: submissionId });
    toast({ title: result.success ? 'Invoice Cleared' : 'Clearance Failed', description: `Status: ${result.status}`, variant: result.success ? 'default' : 'destructive' });
    await Promise.all([fetchSubmissions(), fetchLogs()]);
    return result;
  };

  const submitReporting = async (submissionId: string) => {
    const result = await callZATCA('submit_reporting', { submission_id: submissionId });
    toast({ title: result.success ? 'Invoice Reported' : 'Reporting Failed', description: `Status: ${result.status}`, variant: result.success ? 'default' : 'destructive' });
    await Promise.all([fetchSubmissions(), fetchLogs()]);
    return result;
  };

  const simulateClearance = async (documentType: string, documentId: string) => {
    const result = await callZATCA('simulate_clearance', { document_type: documentType, document_id: documentId });
    toast({ title: 'Simulation Complete', description: `Status: ${result.clearance?.status || 'OK'}` });
    await Promise.all([fetchSubmissions(), fetchLogs()]);
    return result;
  };

  const onboardCSID = async (otp: string) => {
    const result = await callZATCA('onboard_csid', { otp });
    toast({ title: 'Onboarding Complete', description: result.message });
    await fetchSettings();
    return result;
  };

  useEffect(() => { loadAll(); }, [activeCompanyId]);

  return {
    settings, submissions, logs, loading,
    saveSettings, generateXML, submitClearance, submitReporting,
    simulateClearance, onboardCSID, refresh: loadAll,
  };
}
