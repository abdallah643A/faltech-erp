import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export function useBillOfMaterials() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { activeCompanyId } = useActiveCompany();

  const { data: boms, isLoading } = useQuery({
    queryKey: ['bill-of-materials', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('bill_of_materials' as any).select('*').order('created_at', { ascending: false }) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createBOM = useMutation({
    mutationFn: async (bom: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const bomNumber = `BOM-${String(Date.now()).slice(-6)}`;
      const { data, error } = await (supabase.from('bill_of_materials' as any).insert({ ...bom, bom_number: bom.bom_number || bomNumber, created_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bill-of-materials'] }); toast({ title: 'BOM created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateBOM = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase.from('bill_of_materials' as any).update(updates).eq('id', id).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bill-of-materials'] }); toast({ title: 'BOM updated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { boms, isLoading, createBOM, updateBOM };
}

export function useBOMLines(bomId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: lines, isLoading } = useQuery({
    queryKey: ['bom-lines', bomId],
    queryFn: async () => {
      if (!bomId) return [];
      const { data, error } = await (supabase.from('bom_lines' as any).select('*').eq('bom_id', bomId).order('line_num') as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!bomId,
  });

  const createLine = useMutation({
    mutationFn: async (line: any) => {
      const { data, error } = await (supabase.from('bom_lines' as any).insert(line).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bom-lines'] }); toast({ title: 'Component added' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteLine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('bom_lines' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bom-lines'] }); },
  });

  return { lines, isLoading, createLine, deleteLine };
}

export function useMRPRuns() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: runs, isLoading } = useQuery({
    queryKey: ['mrp-runs'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('mrp_runs' as any).select('*').order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const createRun = useMutation({
    mutationFn: async (run: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const runNumber = `MRP-${String(Date.now()).slice(-6)}`;
      const { data, error } = await (supabase.from('mrp_runs' as any).insert({ ...run, run_number: runNumber, created_by: user?.id }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mrp-runs'] }); toast({ title: 'MRP run created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateRun = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase.from('mrp_runs' as any).update(updates).eq('id', id).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mrp-runs'] }); toast({ title: 'MRP run updated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { runs, isLoading, createRun, updateRun };
}

export function useMRPResults(runId?: string) {
  const { data: results, isLoading } = useQuery({
    queryKey: ['mrp-results', runId],
    queryFn: async () => {
      if (!runId) return [];
      const { data, error } = await (supabase.from('mrp_results' as any).select('*').eq('mrp_run_id', runId).order('shortage_qty', { ascending: false }) as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!runId,
  });

  return { results, isLoading };
}
