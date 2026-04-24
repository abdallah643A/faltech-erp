import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { toast } from '@/hooks/use-toast';

export interface BOQSection {
  id: string;
  company_id: string | null;
  project_id: string | null;
  bid_id: string | null;
  version: number;
  version_label: string;
  section_code: string;
  section_title: string;
  parent_id: string | null;
  measurement_standard: string;
  sort_order: number;
  is_locked: boolean;
  status: string;
  currency: string;
  exchange_rate: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BOQItem {
  id: string;
  section_id: string;
  item_ref: string;
  description: string;
  unit: string;
  quantity: number;
  qto_linked_quantity: number;
  rate: number;
  amount: number;
  labor_cost: number;
  material_cost: number;
  plant_cost: number;
  subcontract_cost: number;
  unit_cost: number;
  markup_percent: number;
  notes: string | null;
  is_provisional: boolean;
  is_prime_cost: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useBOQ() {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();

  const sections = useQuery({
    queryKey: ['boq-sections', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('boq_sections').select('*').order('sort_order');
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as BOQSection[];
    },
  });

  const createSection = useMutation({
    mutationFn: async (data: Partial<BOQSection>) => {
      const { error } = await supabase.from('boq_sections').insert({ ...data, company_id: activeCompanyId } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['boq-sections'] }); toast({ title: 'BOQ Section created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateSection = useMutation({
    mutationFn: async ({ id, ...data }: Partial<BOQSection> & { id: string }) => {
      const { error } = await supabase.from('boq_sections').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boq-sections'] }),
  });

  const deleteSection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('boq_sections').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['boq-sections'] }); toast({ title: 'Section deleted' }); },
  });

  const useItems = (sectionId: string | null) => useQuery({
    queryKey: ['boq-items', sectionId],
    enabled: !!sectionId,
    queryFn: async () => {
      const { data, error } = await supabase.from('boq_items').select('*').eq('section_id', sectionId!).order('sort_order');
      if (error) throw error;
      return data as unknown as BOQItem[];
    },
  });

  const allItems = useQuery({
    queryKey: ['boq-items-all', activeCompanyId],
    queryFn: async () => {
      const secs = sections.data || [];
      if (secs.length === 0) return [];
      const secIds = secs.map(s => s.id);
      const { data, error } = await supabase.from('boq_items').select('*').in('section_id', secIds).order('sort_order');
      if (error) throw error;
      return data as unknown as BOQItem[];
    },
    enabled: !!sections.data && sections.data.length > 0,
  });

  const createItem = useMutation({
    mutationFn: async (data: Partial<BOQItem>) => {
      const { error } = await supabase.from('boq_items').insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['boq-items'] }); qc.invalidateQueries({ queryKey: ['boq-items-all'] }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...data }: Partial<BOQItem> & { id: string }) => {
      const { error } = await supabase.from('boq_items').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['boq-items'] }); qc.invalidateQueries({ queryKey: ['boq-items-all'] }); },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('boq_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['boq-items'] }); qc.invalidateQueries({ queryKey: ['boq-items-all'] }); },
  });

  return { sections, createSection, updateSection, deleteSection, useItems, allItems, createItem, updateItem, deleteItem };
}
