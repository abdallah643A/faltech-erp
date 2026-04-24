import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { toast } from '@/hooks/use-toast';

export interface Bid {
  id: string;
  company_id: string | null;
  branch_id: string | null;
  bid_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  client_name: string | null;
  client_contact: string | null;
  client_email: string | null;
  client_phone: string | null;
  business_partner_id: string | null;
  opportunity_id: string | null;
  template_id: string | null;
  issue_date: string | null;
  due_date: string | null;
  submission_date: string | null;
  decision_date: string | null;
  currency: string;
  estimated_value: number;
  total_cost: number;
  markup_percent: number;
  contingency_percent: number;
  overhead_percent: number;
  profit_percent: number;
  final_price: number;
  margin_percent: number;
  project_type: string | null;
  bid_type: string | null;
  sector: string | null;
  region: string | null;
  go_no_go_score: number | null;
  go_no_go_decision: string | null;
  go_no_go_criteria: Record<string, unknown>;
  win_loss_reason: string | null;
  win_loss_tags: string[] | null;
  competitor_bid_amount: number | null;
  competitor_name: string | null;
  lessons_learned: string | null;
  documents: unknown[];
  notes: string | null;
  created_by: string | null;
  submitted_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BidItem {
  id: string;
  bid_id: string;
  parent_id: string | null;
  line_num: number;
  item_code: string | null;
  description: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  unit_cost: number;
  total_cost: number;
  markup_percent: number;
  unit_price: number;
  total_price: number;
  price_source: string | null;
  price_source_ref: string | null;
  price_last_updated: string | null;
  subcontractor_name: string | null;
  subcontractor_quote_ref: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BidTemplate {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  template_type: string;
  category: string | null;
  sections: unknown[];
  default_markup_percent: number;
  default_contingency_percent: number;
  is_active: boolean;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BidReview {
  id: string;
  bid_id: string;
  reviewer_id: string | null;
  reviewer_name: string;
  review_stage: number;
  stage_name: string | null;
  status: string;
  comments: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface BidTeamMember {
  id: string;
  bid_id: string;
  user_id: string | null;
  member_name: string;
  role: string;
  assigned_sections: string[] | null;
  is_lead: boolean;
  created_at: string;
}

export interface BidMaterialPrice {
  id: string;
  company_id: string | null;
  material_code: string;
  material_name: string;
  category: string | null;
  unit: string | null;
  unit_price: number;
  currency: string;
  supplier_name: string | null;
  effective_date: string;
  expiry_date: string | null;
  price_change_percent: number | null;
  is_active: boolean;
  last_updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BidLaborRate {
  id: string;
  company_id: string | null;
  trade: string;
  classification: string | null;
  region: string | null;
  hourly_rate: number;
  overtime_multiplier: number;
  productivity_factor: number;
  currency: string;
  effective_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useBidManagement() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  // ---- BIDS ----
  const bids = useQuery({
    queryKey: ['bids', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('bids').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Bid[];
    },
  });

  const createBid = useMutation({
    mutationFn: async (data: Partial<Bid>) => {
      const { error } = await supabase.from('bids').insert({ ...data, company_id: activeCompanyId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
      toast({ title: 'Bid created successfully' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateBid = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Bid> & { id: string }) => {
      const { error } = await supabase.from('bids').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
      toast({ title: 'Bid updated successfully' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteBid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bids').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
      toast({ title: 'Bid deleted' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // ---- BID ITEMS ----
  const useBidItems = (bidId: string | null) => useQuery({
    queryKey: ['bid-items', bidId],
    enabled: !!bidId,
    queryFn: async () => {
      const { data, error } = await supabase.from('bid_items').select('*').eq('bid_id', bidId!).order('sort_order');
      if (error) throw error;
      return data as unknown as BidItem[];
    },
  });

  const createBidItem = useMutation({
    mutationFn: async (data: Partial<BidItem>) => {
      const { error } = await supabase.from('bid_items').insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bid-items'] }),
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateBidItem = useMutation({
    mutationFn: async ({ id, ...data }: Partial<BidItem> & { id: string }) => {
      const { error } = await supabase.from('bid_items').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bid-items'] }),
  });

  const deleteBidItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bid_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bid-items'] }),
  });

  // ---- TEMPLATES ----
  const templates = useQuery({
    queryKey: ['bid-templates', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('bid_templates').select('*').eq('is_active', true).order('name');
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as BidTemplate[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (data: Partial<BidTemplate>) => {
      const { error } = await supabase.from('bid_templates').insert({ ...data, company_id: activeCompanyId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bid-templates'] });
      toast({ title: 'Template created' });
    },
  });

  // ---- REVIEWS ----
  const useBidReviews = (bidId: string | null) => useQuery({
    queryKey: ['bid-reviews', bidId],
    enabled: !!bidId,
    queryFn: async () => {
      const { data, error } = await supabase.from('bid_reviews').select('*').eq('bid_id', bidId!).order('review_stage');
      if (error) throw error;
      return data as unknown as BidReview[];
    },
  });

  const createReview = useMutation({
    mutationFn: async (data: Partial<BidReview>) => {
      const { error } = await supabase.from('bid_reviews').insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bid-reviews'] }),
  });

  // ---- TEAM MEMBERS ----
  const useBidTeam = (bidId: string | null) => useQuery({
    queryKey: ['bid-team', bidId],
    enabled: !!bidId,
    queryFn: async () => {
      const { data, error } = await supabase.from('bid_team_members').select('*').eq('bid_id', bidId!);
      if (error) throw error;
      return data as unknown as BidTeamMember[];
    },
  });

  // ---- MATERIAL PRICES ----
  const materialPrices = useQuery({
    queryKey: ['bid-material-prices', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('bid_material_prices').select('*').eq('is_active', true).order('material_name');
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as BidMaterialPrice[];
    },
  });

  const createMaterialPrice = useMutation({
    mutationFn: async (data: Partial<BidMaterialPrice>) => {
      const { error } = await supabase.from('bid_material_prices').insert({ ...data, company_id: activeCompanyId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bid-material-prices'] });
      toast({ title: 'Material price added' });
    },
  });

  // ---- LABOR RATES ----
  const laborRates = useQuery({
    queryKey: ['bid-labor-rates', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('bid_labor_rates').select('*').eq('is_active', true).order('trade');
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as BidLaborRate[];
    },
  });

  const createLaborRate = useMutation({
    mutationFn: async (data: Partial<BidLaborRate>) => {
      const { error } = await supabase.from('bid_labor_rates').insert({ ...data, company_id: activeCompanyId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bid-labor-rates'] });
      toast({ title: 'Labor rate added' });
    },
  });

  // ---- ANALYTICS HELPERS ----
  const bidStats = () => {
    const allBids = bids.data || [];
    const totalBids = allBids.length;
    const wonBids = allBids.filter(b => b.status === 'won').length;
    const lostBids = allBids.filter(b => b.status === 'lost').length;
    const activeBids = allBids.filter(b => ['draft', 'qualifying', 'in_progress', 'under_review', 'approved'].includes(b.status)).length;
    const submittedBids = allBids.filter(b => b.status === 'submitted').length;
    const winRate = (wonBids + lostBids) > 0 ? (wonBids / (wonBids + lostBids)) * 100 : 0;
    const pipelineValue = allBids.filter(b => !['won', 'lost', 'cancelled', 'no_bid'].includes(b.status)).reduce((s, b) => s + (b.final_price || b.estimated_value || 0), 0);
    const wonValue = allBids.filter(b => b.status === 'won').reduce((s, b) => s + (b.final_price || 0), 0);
    const avgMargin = allBids.filter(b => b.status === 'won' && b.margin_percent).reduce((s, b, _, a) => s + (b.margin_percent || 0) / a.length, 0);

    return { totalBids, wonBids, lostBids, activeBids, submittedBids, winRate, pipelineValue, wonValue, avgMargin };
  };

  return {
    bids, createBid, updateBid, deleteBid,
    useBidItems, createBidItem, updateBidItem, deleteBidItem,
    templates, createTemplate,
    useBidReviews, createReview,
    useBidTeam,
    materialPrices, createMaterialPrice,
    laborRates, createLaborRate,
    bidStats,
  };
}
