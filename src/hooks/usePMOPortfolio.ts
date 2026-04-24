import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface PMOProgram {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  status: string;
  priority: string;
  strategic_objective: string | null;
  program_manager_id: string | null;
  start_date: string | null;
  end_date: string | null;
  total_budget: number;
  company_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PMOProjectPortfolio {
  id: string;
  project_id: string;
  program_id: string | null;
  classification: string;
  strategic_priority: number;
  delivery_risk: number;
  investment_tier: string;
  methodology: string;
  health_status: string;
  benefits_description: string | null;
  lessons_learned: string | null;
  closure_date: string | null;
  company_id: string | null;
  created_at: string;
  updated_at: string;
  project?: any;
  program?: PMOProgram | null;
}

export interface PMOProjectDependency {
  id: string;
  source_project_id: string;
  target_project_id: string;
  dependency_type: string;
  description: string | null;
  is_critical: boolean;
  status: string;
  company_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PMORisk {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  category: string;
  probability: number;
  impact: number;
  risk_score: number;
  status: string;
  owner_id: string | null;
  owner_name: string | null;
  mitigation_plan: string | null;
  contingency_plan: string | null;
  risk_appetite: string;
  materialized_at: string | null;
  resolved_at: string | null;
  company_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PMOIssue {
  id: string;
  project_id: string;
  risk_id: string | null;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  owner_id: string | null;
  owner_name: string | null;
  resolution: string | null;
  escalation_level: number;
  escalated_to: string | null;
  due_date: string | null;
  resolved_at: string | null;
  company_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PMOResource {
  id: string;
  name: string;
  email: string | null;
  resource_type: string;
  department: string | null;
  skill_category: string | null;
  skills: string[];
  hourly_rate: number;
  available_hours_per_week: number;
  employee_id: string | null;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PMOResourceAllocation {
  id: string;
  resource_id: string;
  project_id: string;
  role_in_project: string | null;
  allocated_hours_per_week: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  company_id: string | null;
  created_at: string;
  resource?: PMOResource;
  project?: any;
}

export interface PMOStageGate {
  id: string;
  project_id: string;
  gate_name: string;
  gate_order: number;
  status: string;
  checklist: any[];
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

export function usePMOPortfolio() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  // Programs
  const { data: programs = [], isLoading: programsLoading } = useQuery({
    queryKey: ['pmo-programs', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('pmo_programs').select('*').order('name');
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as PMOProgram[];
    },
  });

  // Portfolio items with project and program data
  const { data: portfolioItems = [], isLoading: portfolioLoading } = useQuery({
    queryKey: ['pmo-portfolio', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('pmo_project_portfolio').select('*, project:projects(*), program:pmo_programs(*)').order('created_at', { ascending: false });
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as PMOProjectPortfolio[];
    },
  });

  // Dependencies
  const { data: dependencies = [], isLoading: dependenciesLoading } = useQuery({
    queryKey: ['pmo-dependencies', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('pmo_project_dependencies').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as PMOProjectDependency[];
    },
  });

  // Risks
  const { data: risks = [], isLoading: risksLoading } = useQuery({
    queryKey: ['pmo-risks', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('pmo_risks').select('*').order('risk_score', { ascending: false });
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as PMORisk[];
    },
  });

  // Issues
  const { data: issues = [], isLoading: issuesLoading } = useQuery({
    queryKey: ['pmo-issues', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('pmo_issues').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as PMOIssue[];
    },
  });

  // Resources
  const { data: resources = [], isLoading: resourcesLoading } = useQuery({
    queryKey: ['pmo-resources', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('pmo_resources').select('*').order('name');
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as PMOResource[];
    },
  });

  // Resource Allocations
  const { data: allocations = [], isLoading: allocationsLoading } = useQuery({
    queryKey: ['pmo-allocations', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('pmo_resource_allocations').select('*, resource:pmo_resources(*), project:projects(*)').order('created_at', { ascending: false });
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as PMOResourceAllocation[];
    },
  });

  // Stage Gates
  const { data: stageGates = [], isLoading: gatesLoading } = useQuery({
    queryKey: ['pmo-stage-gates', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('pmo_stage_gates').select('*').order('gate_order');
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as PMOStageGate[];
    },
  });

  // Mutations
  const createProgram = useMutation({
    mutationFn: async (data: Partial<PMOProgram>) => {
      const { error } = await supabase.from('pmo_programs').insert({ ...data, company_id: activeCompanyId } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pmo-programs'] }); toast({ title: 'Program created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const createPortfolioItem = useMutation({
    mutationFn: async (data: Partial<PMOProjectPortfolio>) => {
      const { error } = await supabase.from('pmo_project_portfolio').insert({ ...data, company_id: activeCompanyId } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pmo-portfolio'] }); toast({ title: 'Portfolio item added' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const createRisk = useMutation({
    mutationFn: async (data: Partial<PMORisk>) => {
      const { error } = await supabase.from('pmo_risks').insert({ ...data, company_id: activeCompanyId } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pmo-risks'] }); toast({ title: 'Risk registered' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateRisk = useMutation({
    mutationFn: async ({ id, ...data }: Partial<PMORisk> & { id: string }) => {
      const { error } = await supabase.from('pmo_risks').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pmo-risks'] }); toast({ title: 'Risk updated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const createIssue = useMutation({
    mutationFn: async (data: Partial<PMOIssue>) => {
      const { error } = await supabase.from('pmo_issues').insert({ ...data, company_id: activeCompanyId } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pmo-issues'] }); toast({ title: 'Issue logged' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const createResource = useMutation({
    mutationFn: async (data: Partial<PMOResource>) => {
      const { error } = await supabase.from('pmo_resources').insert({ ...data, company_id: activeCompanyId } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pmo-resources'] }); toast({ title: 'Resource added' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const createAllocation = useMutation({
    mutationFn: async (data: Partial<PMOResourceAllocation>) => {
      const { error } = await supabase.from('pmo_resource_allocations').insert({ ...data, company_id: activeCompanyId } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pmo-allocations'] }); toast({ title: 'Resource allocated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const createDependency = useMutation({
    mutationFn: async (data: Partial<PMOProjectDependency>) => {
      const { error } = await supabase.from('pmo_project_dependencies').insert({ ...data, company_id: activeCompanyId } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pmo-dependencies'] }); toast({ title: 'Dependency added' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const createStageGate = useMutation({
    mutationFn: async (data: Partial<PMOStageGate>) => {
      const { error } = await supabase.from('pmo_stage_gates').insert({ ...data, company_id: activeCompanyId } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pmo-stage-gates'] }); toast({ title: 'Stage gate created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateStageGate = useMutation({
    mutationFn: async ({ id, ...data }: Partial<PMOStageGate> & { id: string }) => {
      const { error } = await supabase.from('pmo_stage_gates').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pmo-stage-gates'] }); toast({ title: 'Gate updated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return {
    programs, programsLoading, createProgram,
    portfolioItems, portfolioLoading, createPortfolioItem,
    dependencies, dependenciesLoading, createDependency,
    risks, risksLoading, createRisk, updateRisk,
    issues, issuesLoading, createIssue,
    resources, resourcesLoading, createResource,
    allocations, allocationsLoading, createAllocation,
    stageGates, gatesLoading, createStageGate, updateStageGate,
  };
}
