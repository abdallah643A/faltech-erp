import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

function companyFilter(q: any, companyId: string | null) {
  return companyId ? q.eq('company_id', companyId) : q;
}

export function useWmsTasks(taskType?: string, status?: string) {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['wms-tasks', activeCompanyId, taskType, status],
    queryFn: async () => {
      let q = supabase.from('wms_tasks' as any).select('*').order('created_at', { ascending: false });
      q = companyFilter(q, activeCompanyId);
      if (taskType) q = q.eq('task_type', taskType);
      if (status) q = q.eq('status', status);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data as any[];
    },
  });

  const createTask = useMutation({
    mutationFn: async (task: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase.from('wms_tasks' as any).insert({
        ...task,
        company_id: activeCompanyId,
        created_by: user?.id,
      }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-tasks'] }); toast({ title: 'Task created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await (supabase.from('wms_tasks' as any).update(updates).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wms-tasks'] }),
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, createTask, updateTask };
}

export function useWmsScans(taskId?: string) {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['wms-scans', activeCompanyId, taskId],
    queryFn: async () => {
      let q = supabase.from('wms_scans' as any).select('*').order('created_at', { ascending: false });
      q = companyFilter(q, activeCompanyId);
      if (taskId) q = q.eq('task_id', taskId);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  const recordScan = useMutation({
    mutationFn: async (scan: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase.from('wms_scans' as any).insert({
        ...scan,
        company_id: activeCompanyId,
        scanned_by: user?.id,
      }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-scans'] }); qc.invalidateQueries({ queryKey: ['wms-tasks'] }); },
    onError: (e: any) => toast({ title: 'Scan error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, recordScan };
}

export function useWmsWaves() {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['wms-waves', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('wms_waves' as any).select('*').order('created_at', { ascending: false });
      q = companyFilter(q, activeCompanyId);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  const createWave = useMutation({
    mutationFn: async (wave: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const waveNumber = `WV-${String(Date.now()).slice(-6)}`;
      const { data, error } = await (supabase.from('wms_waves' as any).insert({
        ...wave, wave_number: waveNumber, company_id: activeCompanyId, created_by: user?.id,
      }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-waves'] }); toast({ title: 'Wave created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateWave = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await (supabase.from('wms_waves' as any).update(updates).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wms-waves'] }),
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, createWave, updateWave };
}

export function useWmsWaveLines(waveId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['wms-wave-lines', waveId],
    enabled: !!waveId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('wms_wave_lines' as any).select('*').eq('wave_id', waveId!).order('line_num') as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const addLine = useMutation({
    mutationFn: async (line: any) => {
      const { data, error } = await (supabase.from('wms_wave_lines' as any).insert(line).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wms-wave-lines'] }),
  });

  return { ...query, addLine };
}

export function useWmsPackingSessions(stationId?: string) {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['wms-pack-sessions', activeCompanyId, stationId],
    queryFn: async () => {
      let q = supabase.from('wms_pack_sessions' as any).select('*').order('created_at', { ascending: false });
      q = companyFilter(q, activeCompanyId);
      if (stationId) q = q.eq('station_id', stationId);
      const { data, error } = await q.limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  const createSession = useMutation({
    mutationFn: async (session: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase.from('wms_pack_sessions' as any).insert({
        ...session, company_id: activeCompanyId, packer_id: user?.id,
      }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-pack-sessions'] }); toast({ title: 'Pack session started' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateSession = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await (supabase.from('wms_pack_sessions' as any).update(updates).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wms-pack-sessions'] }),
  });

  return { ...query, createSession, updateSession };
}

export function useWmsPackingStations() {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['wms-packing-stations', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('wms_packing_stations' as any).select('*').order('station_code');
      q = companyFilter(q, activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createStation = useMutation({
    mutationFn: async (station: any) => {
      const { data, error } = await (supabase.from('wms_packing_stations' as any).insert({
        ...station, company_id: activeCompanyId,
      }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-packing-stations'] }); toast({ title: 'Station created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, createStation };
}

export function useWmsCycleCounts() {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['wms-cycle-counts', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('wms_cycle_counts' as any).select('*').order('created_at', { ascending: false });
      q = companyFilter(q, activeCompanyId);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  const createCount = useMutation({
    mutationFn: async (cc: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const countNumber = `CC-${String(Date.now()).slice(-6)}`;
      const { data, error } = await (supabase.from('wms_cycle_counts' as any).insert({
        ...cc, count_number: countNumber, company_id: activeCompanyId, counter_id: user?.id,
      }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-cycle-counts'] }); toast({ title: 'Cycle count created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateCount = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await (supabase.from('wms_cycle_counts' as any).update(updates).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wms-cycle-counts'] }),
  });

  return { ...query, createCount, updateCount };
}

export function useWmsCycleCountLines(countId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['wms-cycle-count-lines', countId],
    enabled: !!countId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('wms_cycle_count_lines' as any).select('*').eq('cycle_count_id', countId!).order('item_code') as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const addLine = useMutation({
    mutationFn: async (line: any) => {
      const { data, error } = await (supabase.from('wms_cycle_count_lines' as any).insert(line).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wms-cycle-count-lines'] }),
  });

  const updateLine = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await (supabase.from('wms_cycle_count_lines' as any).update(updates).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wms-cycle-count-lines'] }),
  });

  return { ...query, addLine, updateLine };
}

export function useWmsExceptions(status?: string) {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['wms-exceptions', activeCompanyId, status],
    queryFn: async () => {
      let q = supabase.from('wms_exceptions' as any).select('*').order('created_at', { ascending: false });
      q = companyFilter(q, activeCompanyId);
      if (status) q = q.eq('status', status);
      const { data, error } = await q.limit(300);
      if (error) throw error;
      return data as any[];
    },
  });

  const createException = useMutation({
    mutationFn: async (exc: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase.from('wms_exceptions' as any).insert({
        ...exc, company_id: activeCompanyId, reported_by: user?.id,
      }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-exceptions'] }); toast({ title: 'Exception reported' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateException = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await (supabase.from('wms_exceptions' as any).update(updates).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wms-exceptions'] }); toast({ title: 'Exception updated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { ...query, createException, updateException };
}
