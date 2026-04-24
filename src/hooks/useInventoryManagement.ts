import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useBinLocations(warehouseCode?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['bin_locations', warehouseCode],
    queryFn: async () => {
      let q = supabase.from('bin_locations' as any).select('*').order('bin_code');
      if (warehouseCode) q = q.eq('warehouse_code', warehouseCode);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (bin: any) => {
      const { data, error } = await (supabase.from('bin_locations' as any).insert(bin).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bin_locations'] });
      toast({ title: 'Bin location created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await (supabase.from('bin_locations' as any).update(updates).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bin_locations'] });
      toast({ title: 'Bin location updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('bin_locations' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bin_locations'] });
      toast({ title: 'Bin location deleted' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, create, update, remove };
}

export function useItemWarehouseInfo(itemCode?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['item_warehouse_info', itemCode],
    queryFn: async () => {
      let q = supabase.from('item_warehouse_info' as any).select('*').order('warehouse_code');
      if (itemCode) q = q.eq('item_code', itemCode);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (info: any) => {
      const { data, error } = await (supabase.from('item_warehouse_info' as any).upsert(info, { onConflict: 'item_code,warehouse_code' }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item_warehouse_info'] });
      toast({ title: 'Item warehouse info saved' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, upsert };
}

export function useBatchSerialNumbers(itemCode?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['batch_serial_numbers', itemCode],
    queryFn: async () => {
      let q = supabase.from('batch_serial_numbers' as any).select('*').order('created_at', { ascending: false });
      if (itemCode) q = q.eq('item_code', itemCode);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (record: any) => {
      const { data, error } = await (supabase.from('batch_serial_numbers' as any).insert(record).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch_serial_numbers'] });
      toast({ title: 'Batch/Serial created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await (supabase.from('batch_serial_numbers' as any).update(updates).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch_serial_numbers'] });
      toast({ title: 'Record updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, create, update };
}

export function useInventoryValuation() {
  return useQuery({
    queryKey: ['inventory_valuation'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('inventory_valuation' as any).select('*').order('snapshot_date', { ascending: false }).limit(500) as any);
      if (error) throw error;
      return data as any[];
    },
  });
}
