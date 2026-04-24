import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { toast } from '@/hooks/use-toast';

export interface CPMSDrawing {
  id: string;
  company_id: string | null;
  project_id: string | null;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  file_name: string | null;
  scale_factor: number;
  scale_unit: string;
  scale_reference_px: number | null;
  scale_reference_real: number | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CPMSDrawingMeasurement {
  id: string;
  drawing_id: string;
  measurement_type: string;
  label: string | null;
  color: string;
  points: Array<{ x: number; y: number }>;
  value: number;
  unit: string;
  notes: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
}

export function useCPMSDrawings(projectId?: string | null) {
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();

  const drawings = useQuery({
    queryKey: ['cpms-drawings', activeCompanyId, projectId],
    queryFn: async () => {
      let q = supabase.from('cpms_drawings').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as CPMSDrawing[];
    },
  });

  const createDrawing = useMutation({
    mutationFn: async (data: Partial<CPMSDrawing>) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from('cpms_drawings').insert({
        ...data,
        company_id: activeCompanyId,
        created_by: user.user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cpms-drawings'] }); toast({ title: 'Drawing uploaded' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateDrawing = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CPMSDrawing> & { id: string }) => {
      const { error } = await supabase.from('cpms_drawings').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cpms-drawings'] }),
  });

  const deleteDrawing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cpms_drawings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cpms-drawings'] }); toast({ title: 'Drawing deleted' }); },
  });

  const useMeasurements = (drawingId: string | null) => useQuery({
    queryKey: ['cpms-drawing-measurements', drawingId],
    enabled: !!drawingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cpms_drawing_measurements')
        .select('*')
        .eq('drawing_id', drawingId!)
        .order('sort_order');
      if (error) throw error;
      return (data as unknown as CPMSDrawingMeasurement[]).map(m => ({
        ...m,
        points: typeof m.points === 'string' ? JSON.parse(m.points) : m.points,
      }));
    },
  });

  const createMeasurement = useMutation({
    mutationFn: async (data: Partial<CPMSDrawingMeasurement>) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from('cpms_drawing_measurements').insert({
        ...data,
        points: JSON.stringify(data.points),
        created_by: user.user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cpms-drawing-measurements'] }),
  });

  const updateMeasurement = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CPMSDrawingMeasurement> & { id: string }) => {
      const payload: any = { ...data };
      if (data.points) payload.points = JSON.stringify(data.points);
      const { error } = await supabase.from('cpms_drawing_measurements').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cpms-drawing-measurements'] }),
  });

  const deleteMeasurement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cpms_drawing_measurements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cpms-drawing-measurements'] }),
  });

  const uploadFile = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `drawings/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('cpms-site-photos').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('cpms-site-photos').getPublicUrl(path);
    return data.publicUrl;
  };

  return {
    drawings, createDrawing, updateDrawing, deleteDrawing,
    useMeasurements, createMeasurement, updateMeasurement, deleteMeasurement,
    uploadFile,
  };
}
