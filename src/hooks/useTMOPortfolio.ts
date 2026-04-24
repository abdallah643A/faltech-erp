import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface TMOTechAsset {
  id: string;
  name: string;
  description: string | null;
  asset_code: string | null;
  category: string;
  subcategory: string | null;
  vendor: string | null;
  version: string | null;
  lifecycle_status: string;
  deployment_type: string;
  owner_department: string | null;
  owner_name: string | null;
  business_criticality: string;
  stability_score: number;
  supportability_score: number;
  strategic_fit_score: number;
  cost_efficiency_score: number;
  health_score: number;
  acquisition_cost: number;
  annual_license_cost: number;
  annual_support_cost: number;
  annual_infra_cost: number;
  total_cost_of_ownership: number;
  go_live_date: string | null;
  end_of_support_date: string | null;
  planned_retirement_date: string | null;
  last_review_date: string | null;
  integration_points: any[];
  tags: any[];
  notes: string | null;
  company_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TMORoadmapItem {
  id: string;
  title: string;
  description: string | null;
  tech_asset_id: string | null;
  domain: string;
  item_type: string;
  status: string;
  priority: string;
  start_date: string | null;
  end_date: string | null;
  budget: number;
  actual_cost: number;
  strategic_objective: string | null;
  dependencies: any[];
  horizon: string;
  version: number;
  linked_project_id: string | null;
  company_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  tech_asset?: TMOTechAsset | null;
}

export interface TMOArchitectureDecision {
  id: string;
  adr_number: string | null;
  title: string;
  context: string | null;
  decision: string | null;
  consequences: string | null;
  status: string;
  category: string;
  decided_by: string | null;
  decided_at: string | null;
  superseded_by: string | null;
  related_tech_asset_id: string | null;
  compliance_score: number;
  company_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TMOStandard {
  id: string;
  name: string;
  description: string | null;
  category: string;
  standard_type: string;
  approved_options: any[];
  version: string;
  effective_date: string | null;
  review_date: string | null;
  approved_by: string | null;
  company_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TMOVendor {
  id: string;
  name: string;
  tier: string;
  category: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contract_value: number;
  contract_start_date: string | null;
  contract_end_date: string | null;
  sla_terms: string | null;
  delivery_score: number;
  quality_score: number;
  responsiveness_score: number;
  innovation_score: number;
  overall_score: number;
  financial_risk: string;
  dependency_risk: string;
  geopolitical_risk: string;
  notes: string | null;
  business_partner_id: string | null;
  company_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useTMOPortfolio() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const techAssets = useQuery({
    queryKey: ['tmo-tech-assets', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('tmo_tech_assets').select('*').order('name');
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TMOTechAsset[];
    },
  });

  const roadmapItems = useQuery({
    queryKey: ['tmo-roadmap', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('tmo_roadmap_items').select('*').order('start_date');
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TMORoadmapItem[];
    },
  });

  const decisions = useQuery({
    queryKey: ['tmo-decisions', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('tmo_architecture_decisions').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TMOArchitectureDecision[];
    },
  });

  const standards = useQuery({
    queryKey: ['tmo-standards', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('tmo_standards').select('*').order('name');
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TMOStandard[];
    },
  });

  const vendors = useQuery({
    queryKey: ['tmo-vendors', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('tmo_vendors').select('*').order('name');
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TMOVendor[];
    },
  });

  const createMutation = (table: string, key: string, label: string) =>
    useMutation({
      mutationFn: async (data: Record<string, any>) => {
        const { error } = await supabase.from(table as any).insert({ ...data, company_id: activeCompanyId } as any);
        if (error) throw error;
      },
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: [key] }); toast({ title: `${label} created` }); },
      onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
    });

  const updateMutation = (table: string, key: string, label: string) =>
    useMutation({
      mutationFn: async ({ id, ...data }: Record<string, any> & { id: string }) => {
        const { error } = await supabase.from(table as any).update(data as any).eq('id', id);
        if (error) throw error;
      },
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: [key] }); toast({ title: `${label} updated` }); },
      onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
    });

  const createTechAsset = createMutation('tmo_tech_assets', 'tmo-tech-assets', 'Tech asset');
  const updateTechAsset = updateMutation('tmo_tech_assets', 'tmo-tech-assets', 'Tech asset');
  const createRoadmapItem = createMutation('tmo_roadmap_items', 'tmo-roadmap', 'Roadmap item');
  const updateRoadmapItem = updateMutation('tmo_roadmap_items', 'tmo-roadmap', 'Roadmap item');
  const createDecision = createMutation('tmo_architecture_decisions', 'tmo-decisions', 'ADR');
  const updateDecision = updateMutation('tmo_architecture_decisions', 'tmo-decisions', 'ADR');
  const createStandard = createMutation('tmo_standards', 'tmo-standards', 'Standard');
  const createVendor = createMutation('tmo_vendors', 'tmo-vendors', 'Vendor');
  const updateVendor = updateMutation('tmo_vendors', 'tmo-vendors', 'Vendor');

  return {
    techAssets: techAssets.data ?? [],
    techAssetsLoading: techAssets.isLoading,
    createTechAsset, updateTechAsset,

    roadmapItems: roadmapItems.data ?? [],
    roadmapLoading: roadmapItems.isLoading,
    createRoadmapItem, updateRoadmapItem,

    decisions: decisions.data ?? [],
    decisionsLoading: decisions.isLoading,
    createDecision, updateDecision,

    standards: standards.data ?? [],
    standardsLoading: standards.isLoading,
    createStandard,

    vendors: vendors.data ?? [],
    vendorsLoading: vendors.isLoading,
    createVendor, updateVendor,
  };
}
