import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface CPMSProject {
  id?: string;
  code: string;
  name: string;
  name_ar?: string;
  type: string;
  classification?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  client_id?: string;
  client_name?: string;
  contract_value: number;
  revised_contract_value?: number;
  currency?: string;
  location?: string;
  city?: string;
  description?: string;
  sap_project_code?: string;
  sap_cost_center?: string;
  branch_id?: string;
  created_by?: string;
  created_at?: string;
  percent_complete?: number;
}

export interface WBSNode {
  id?: string;
  project_id: string;
  parent_id?: string;
  code: string;
  name: string;
  level: number;
  type: string;
  sort_order?: number;
  start_date?: string;
  end_date?: string;
  budget_amount?: number;
  progress_pct?: number;
  status?: string;
  children?: WBSNode[];
}

export function useCPMS() {
  const [projects, setProjects] = useState<CPMSProject[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('cpms_projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      setProjects((data || []) as CPMSProject[]);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (project: Partial<CPMSProject>) => {
    try {
      const { data, error } = await supabase
        .from('cpms_projects')
        .insert({ ...project, created_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) } as any)
        .select()
        .single();
      if (error) throw error;
      toast({ title: 'Project created', description: `${project.name} created successfully` });
      await fetchProjects();
      return data;
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      return null;
    }
  };

  const updateProject = async (id: string, updates: Partial<CPMSProject>) => {
    try {
      const { error } = await supabase.from('cpms_projects').update(updates as any).eq('id', id);
      if (error) throw error;
      toast({ title: 'Project updated' });
      await fetchProjects();
      return true;
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase.from('cpms_projects').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Project deleted' });
      await fetchProjects();
      return true;
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  // WBS
  const fetchWBS = async (projectId: string): Promise<WBSNode[]> => {
    const { data } = await supabase
      .from('cpms_wbs_nodes')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order');
    return (data || []) as WBSNode[];
  };

  const createWBSNode = async (node: Partial<WBSNode>) => {
    const { data, error } = await supabase.from('cpms_wbs_nodes').insert(node as any).select().single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return null; }
    return data;
  };

  const updateWBSNode = async (id: string, updates: Partial<WBSNode>) => {
    const { error } = await supabase.from('cpms_wbs_nodes').update(updates as any).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    return true;
  };

  const deleteWBSNode = async (id: string) => {
    const { error } = await supabase.from('cpms_wbs_nodes').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    return true;
  };

  // Generic CRUD helpers for sub-tables
  const fetchTable = async (table: string, filters: Record<string, any> = {}, orderBy = 'created_at') => {
    let query = supabase.from(table as any).select('*').order(orderBy, { ascending: false });
    Object.entries(filters).forEach(([k, v]) => { query = query.eq(k, v); });
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  };

  const insertRow = async (table: string, row: Record<string, any>) => {
    const { data, error } = await supabase.from(table as any).insert(row).select().single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return null; }
    toast({ title: 'Record created' });
    return data;
  };

  const updateRow = async (table: string, id: string, updates: Record<string, any>) => {
    const { error } = await supabase.from(table as any).update(updates).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Record updated' });
    return true;
  };

  const deleteRow = async (table: string, id: string) => {
    const { error } = await supabase.from(table as any).delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Record deleted' });
    return true;
  };

  // Dashboard stats
  const fetchDashboardStats = async () => {
    const [projectsRes, dailyReportsRes, rfisRes, hseRes, ipasRes, commitmentsRes] = await Promise.all([
      supabase.from('cpms_projects').select('id, status, contract_value, revised_contract_value'),
      supabase.from('cpms_daily_reports').select('id, project_id, report_date, status').order('report_date', { ascending: false }).limit(50),
      supabase.from('cpms_rfis').select('id, status, project_id'),
      supabase.from('cpms_hse_incidents').select('id, type, severity, status'),
      supabase.from('cpms_ipas').select('id, status, net_amount, certified_amount'),
      supabase.from('cpms_commitments').select('id, committed_amount, invoiced_amount, status'),
    ]);

    const allProjects = (projectsRes.data || []) as any[];
    const totalContractValue = allProjects.reduce((s: number, p: any) => s + (p.revised_contract_value || p.contract_value || 0), 0);
    const activeProjects = allProjects.filter((p: any) => p.status === 'active').length;
    const openRFIs = ((rfisRes.data || []) as any[]).filter((r: any) => r.status === 'open').length;
    const openIncidents = ((hseRes.data || []) as any[]).filter((h: any) => h.status !== 'closed').length;
    const totalCommitted = ((commitmentsRes.data || []) as any[]).reduce((s: number, c: any) => s + (c.committed_amount || 0), 0);
    const totalCertified = ((ipasRes.data || []) as any[]).reduce((s: number, i: any) => s + (i.certified_amount || 0), 0);

    return {
      totalProjects: allProjects.length,
      activeProjects,
      totalContractValue,
      openRFIs,
      openIncidents,
      totalCommitted,
      totalCertified,
      recentReports: dailyReportsRes.data || [],
    };
  };

  useEffect(() => { fetchProjects(); }, []);

  return {
    projects, loading, fetchProjects,
    createProject, updateProject, deleteProject,
    fetchWBS, createWBSNode, updateWBSNode, deleteWBSNode,
    fetchTable, insertRow, updateRow, deleteRow,
    fetchDashboardStats,
  };
}
