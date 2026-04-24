import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export type WorkspaceKey = 'general' | 'sales' | 'procurement' | 'hr' | 'finance' | 'manufacturing' | 'construction' | 'executive' | 'hospital';

export interface WorkspaceInfo {
  key: WorkspaceKey;
  label: string;
  labelAr: string;
  icon: string;
  description: string;
}

export const WORKSPACES: WorkspaceInfo[] = [
  { key: 'general', label: 'General Dashboard', labelAr: 'لوحة عامة', icon: 'LayoutDashboard', description: 'Overview of all modules' },
  { key: 'sales', label: 'Sales Workspace', labelAr: 'مساحة المبيعات', icon: 'TrendingUp', description: 'Leads, quotes, orders & pipeline' },
  { key: 'procurement', label: 'Procurement Workspace', labelAr: 'مساحة المشتريات', icon: 'Package', description: 'POs, vendors & material requests' },
  { key: 'hr', label: 'HR Workspace', labelAr: 'مساحة الموارد البشرية', icon: 'Users', description: 'Employees, leave & attendance' },
  { key: 'finance', label: 'Finance Workspace', labelAr: 'مساحة المالية', icon: 'Landmark', description: 'Invoices, payments & reports' },
  { key: 'manufacturing', label: 'Manufacturing Workspace', labelAr: 'مساحة التصنيع', icon: 'Factory', description: 'Production, BOM & quality' },
  { key: 'construction', label: 'Construction Workspace', labelAr: 'مساحة المقاولات', icon: 'HardHat', description: 'Projects, tenders & site reports' },
  { key: 'hospital', label: 'Hospital Workspace', labelAr: 'مساحة المستشفى', icon: 'Heart', description: 'Patients, ER, beds & pharmacy' },
  { key: 'executive', label: 'Executive Dashboard', labelAr: 'لوحة تنفيذية', icon: 'Crown', description: 'KPIs, approvals & health metrics' },
];

export function useWorkspace() {
  const { user, profile, refreshProfile } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const preferredWorkspace = profile?.preferred_workspace as WorkspaceKey | null;

  const setWorkspace = useMutation({
    mutationFn: async (workspace: WorkspaceKey) => {
      if (!user?.id) return;
      await supabase.from('profiles').update({ preferred_workspace: workspace }).eq('user_id', user.id);
    },
    onSuccess: () => {
      refreshProfile();
    },
  });

  // Fetch admin-configured widgets for a workspace
  const { data: workspaceWidgets = [] } = useQuery({
    queryKey: ['workspace-configs', preferredWorkspace, activeCompanyId],
    queryFn: async () => {
      if (!preferredWorkspace) return [];
      let query = supabase
        .from('workspace_configs')
        .select('*')
        .eq('workspace_key', preferredWorkspace)
        .order('default_order', { ascending: true });
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data } = await query;
      return data || [];
    },
    enabled: !!preferredWorkspace,
  });

  return {
    preferredWorkspace,
    setWorkspace: setWorkspace.mutate,
    isSettingWorkspace: setWorkspace.isPending,
    workspaceWidgets,
    needsSelection: !!user && !preferredWorkspace,
  };
}
