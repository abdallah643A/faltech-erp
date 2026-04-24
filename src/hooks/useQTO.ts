import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { toast } from '@/hooks/use-toast';

export interface QTOSheet {
  id: string;
  company_id: string | null;
  project_id: string | null;
  bid_id: string | null;
  sheet_name: string;
  description: string | null;
  drawing_reference: string | null;
  revision: string;
  measurement_standard: string;
  status: string;
  created_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QTOMeasurement {
  id: string;
  sheet_id: string;
  boq_item_id: string | null;
  line_num: number;
  location: string | null;
  description: string;
  dimension_type: string;
  nr: number;
  length: number;
  width: number;
  height: number;
  quantity: number;
  unit: string;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

export function useQTO() {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();

  const sheets = useQuery({
    queryKey: ['qto-sheets', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('qto_sheets').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as QTOSheet[];
    },
  });

  const createSheet = useMutation({
    mutationFn: async (data: Partial<QTOSheet>) => {
      const { error } = await supabase.from('qto_sheets').insert({ ...data, company_id: activeCompanyId } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['qto-sheets'] }); toast({ title: 'QTO Sheet created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateSheet = useMutation({
    mutationFn: async ({ id, ...data }: Partial<QTOSheet> & { id: string }) => {
      const { error } = await supabase.from('qto_sheets').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['qto-sheets'] }); },
  });

  const deleteSheet = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('qto_sheets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['qto-sheets'] }); toast({ title: 'Sheet deleted' }); },
  });

  const useMeasurements = (sheetId: string | null) => useQuery({
    queryKey: ['qto-measurements', sheetId],
    enabled: !!sheetId,
    queryFn: async () => {
      const { data, error } = await supabase.from('qto_measurements').select('*').eq('sheet_id', sheetId!).order('sort_order');
      if (error) throw error;
      return data as unknown as QTOMeasurement[];
    },
  });

  const createMeasurement = useMutation({
    mutationFn: async (data: Partial<QTOMeasurement>) => {
      const { error } = await supabase.from('qto_measurements').insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qto-measurements'] }),
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateMeasurement = useMutation({
    mutationFn: async ({ id, ...data }: Partial<QTOMeasurement> & { id: string }) => {
      const { error } = await supabase.from('qto_measurements').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qto-measurements'] }),
  });

  const deleteMeasurement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('qto_measurements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qto-measurements'] }),
  });

  return { sheets, createSheet, updateSheet, deleteSheet, useMeasurements, createMeasurement, updateMeasurement, deleteMeasurement };
}
