import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface MeasurementReport {
  id: string;
  company_id: string | null;
  project_id: string | null;
  drawing_id: string | null;
  title: string;
  report_type: string;
  template_id: string | null;
  format: string;
  file_url: string | null;
  file_size: number | null;
  status: string;
  filters: any;
  metadata: any;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportVersion {
  id: string;
  report_id: string;
  version_number: number;
  changes_summary: string | null;
  snapshot_data: any;
  file_url: string | null;
  file_size: number | null;
  created_by: string | null;
  created_at: string;
}

export interface ReportAuditLog {
  id: string;
  company_id: string | null;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  report_id: string | null;
  report_type: string | null;
  export_format: string | null;
  file_size: number | null;
  duration_ms: number | null;
  status: string;
  ip_address: string | null;
  device_info: string | null;
  filters_used: any;
  details: any;
  created_at: string;
}

export interface ScheduledReport {
  id: string;
  company_id: string | null;
  project_id: string | null;
  title: string;
  schedule_type: string;
  frequency: string;
  timezone: string;
  template_id: string | null;
  report_type: string;
  export_format: string;
  filters: any;
  recipients: any;
  is_active: boolean;
  conditional_only: boolean;
  next_run: string | null;
  last_run: string | null;
  last_status: string | null;
  run_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeasurementReportTemplate {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  template_type: string;
  layout_config: any;
  branding_config: any;
  header_config: any;
  footer_config: any;
  sections: any;
  is_shared: boolean;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useCPMSReporting() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const qc = useQueryClient();

  const reports = useQuery({
    queryKey: ['cpms-measurement-reports', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('cpms_measurement_reports' as any).select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data as unknown as MeasurementReport[];
    },
  });

  const auditLogs = useQuery({
    queryKey: ['cpms-report-audit-logs', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('cpms_report_audit_logs' as any).select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data as unknown as ReportAuditLog[];
    },
  });

  const schedules = useQuery({
    queryKey: ['cpms-scheduled-reports', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('cpms_scheduled_reports' as any).select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as ScheduledReport[];
    },
  });

  const templates = useQuery({
    queryKey: ['cpms-measurement-report-templates', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('cpms_measurement_report_templates' as any).select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as MeasurementReportTemplate[];
    },
  });

  const createReport = useMutation({
    mutationFn: async (data: Partial<MeasurementReport>) => {
      const { error } = await supabase.from('cpms_measurement_reports' as any).insert({
        ...data,
        company_id: activeCompanyId,
        created_by: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cpms-measurement-reports'] }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const logAudit = useMutation({
    mutationFn: async (data: Partial<ReportAuditLog>) => {
      const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('user_id', user?.id || '').single();
      const { error } = await supabase.from('cpms_report_audit_logs' as any).insert({
        ...data,
        company_id: activeCompanyId,
        user_id: user?.id,
        user_email: profile?.email,
        user_name: profile?.full_name,
        device_info: navigator.userAgent,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cpms-report-audit-logs'] }),
  });

  const createSchedule = useMutation({
    mutationFn: async (data: Partial<ScheduledReport>) => {
      const { error } = await supabase.from('cpms_scheduled_reports' as any).insert({
        ...data,
        company_id: activeCompanyId,
        created_by: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cpms-scheduled-reports'] }); toast({ title: 'Schedule created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateSchedule = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ScheduledReport> & { id: string }) => {
      const { error } = await supabase.from('cpms_scheduled_reports' as any).update({ ...data, updated_at: new Date().toISOString() } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cpms-scheduled-reports'] }); },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cpms_scheduled_reports' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cpms-scheduled-reports'] }); toast({ title: 'Schedule deleted' }); },
  });

  const createTemplate = useMutation({
    mutationFn: async (data: Partial<MeasurementReportTemplate>) => {
      const { error } = await supabase.from('cpms_measurement_report_templates' as any).insert({
        ...data,
        company_id: activeCompanyId,
        created_by: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cpms-measurement-report-templates'] }); toast({ title: 'Template created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...data }: Partial<MeasurementReportTemplate> & { id: string }) => {
      const { error } = await supabase.from('cpms_measurement_report_templates' as any).update({ ...data, updated_at: new Date().toISOString() } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cpms-measurement-report-templates'] }); },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cpms_measurement_report_templates' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cpms-measurement-report-templates'] }); toast({ title: 'Template deleted' }); },
  });

  const createVersion = useMutation({
    mutationFn: async (data: Partial<ReportVersion>) => {
      const { error } = await supabase.from('cpms_report_versions' as any).insert({
        ...data,
        created_by: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cpms-report-versions'] }),
  });

  const getVersions = (reportId: string) => useQuery({
    queryKey: ['cpms-report-versions', reportId],
    enabled: !!reportId,
    queryFn: async () => {
      const { data, error } = await supabase.from('cpms_report_versions' as any).select('*').eq('report_id', reportId).order('version_number', { ascending: false });
      if (error) throw error;
      return data as unknown as ReportVersion[];
    },
  });

  return {
    reports, auditLogs, schedules, templates,
    createReport, logAudit, createSchedule, updateSchedule, deleteSchedule,
    createTemplate, updateTemplate, deleteTemplate,
    createVersion, getVersions,
  };
}
