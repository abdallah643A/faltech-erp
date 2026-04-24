import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface Defect {
  id?: string;
  project_id: string;
  defect_number: string;
  title: string;
  description?: string;
  severity: string;
  category: string;
  location?: string;
  area?: string;
  phase?: string;
  status: string;
  assigned_to?: string;
  reported_by?: string;
  reported_date?: string;
  due_date?: string;
  resolved_date?: string;
  resolution_notes?: string;
  photos?: any[];
  cost_to_fix?: number;
  created_at?: string;
}

export interface PunchItem {
  id?: string;
  project_id: string;
  punch_number: string;
  title: string;
  description?: string;
  area?: string;
  discipline?: string;
  status: string;
  priority: string;
  assigned_to?: string;
  due_date?: string;
  completed_date?: string;
  photos?: any[];
  notes?: string;
  created_at?: string;
}

export interface Inspection {
  id?: string;
  project_id: string;
  inspection_number: string;
  title: string;
  type: string;
  area?: string;
  discipline?: string;
  status: string;
  inspector_name?: string;
  scheduled_date?: string;
  completed_date?: string;
  overall_result?: string;
  score?: number;
  checklist_items?: any[];
  defects_found?: number;
  punch_items_created?: number;
  photos?: any[];
  notes?: string;
  created_at?: string;
}

export function useCPMSQuality(projectId?: string) {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [punchLists, setPunchLists] = useState<PunchItem[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchAll = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [d, p, i] = await Promise.all([
        supabase.from('cpms_defects' as any).select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
        supabase.from('cpms_punch_lists' as any).select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
        supabase.from('cpms_inspections' as any).select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      ]);
      setDefects((d.data || []) as any[]);
      setPunchLists((p.data || []) as any[]);
      setInspections((i.data || []) as any[]);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Defects CRUD
  const createDefect = async (defect: Partial<Defect>) => {
    const num = `DEF-${Date.now().toString(36).toUpperCase()}`;
    const { data, error } = await supabase.from('cpms_defects' as any)
      .insert({ ...defect, defect_number: num, created_by: user?.id } as any).select().single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return null; }
    toast({ title: 'Defect logged' });
    await fetchAll();
    return data;
  };

  const updateDefect = async (id: string, updates: Partial<Defect>) => {
    const { error } = await supabase.from('cpms_defects' as any).update(updates as any).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Defect updated' });
    await fetchAll();
    return true;
  };

  // Punch Lists CRUD
  const createPunchItem = async (item: Partial<PunchItem>) => {
    const num = `PL-${Date.now().toString(36).toUpperCase()}`;
    const { data, error } = await supabase.from('cpms_punch_lists' as any)
      .insert({ ...item, punch_number: num, created_by: user?.id } as any).select().single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return null; }
    toast({ title: 'Punch item created' });
    await fetchAll();
    return data;
  };

  const updatePunchItem = async (id: string, updates: Partial<PunchItem>) => {
    const { error } = await supabase.from('cpms_punch_lists' as any).update(updates as any).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Punch item updated' });
    await fetchAll();
    return true;
  };

  // Inspections CRUD
  const createInspection = async (inspection: Partial<Inspection>) => {
    const num = `INS-${Date.now().toString(36).toUpperCase()}`;
    const { data, error } = await supabase.from('cpms_inspections' as any)
      .insert({ ...inspection, inspection_number: num, created_by: user?.id } as any).select().single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return null; }
    toast({ title: 'Inspection created' });
    await fetchAll();
    return data;
  };

  const updateInspection = async (id: string, updates: Partial<Inspection>) => {
    const { error } = await supabase.from('cpms_inspections' as any).update(updates as any).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Inspection updated' });
    await fetchAll();
    return true;
  };

  const deleteRecord = async (table: string, id: string) => {
    const { error } = await supabase.from(table as any).delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Deleted' });
    await fetchAll();
    return true;
  };

  useEffect(() => { fetchAll(); }, [projectId]);

  return {
    defects, punchLists, inspections, loading, fetchAll,
    createDefect, updateDefect,
    createPunchItem, updatePunchItem,
    createInspection, updateInspection,
    deleteRecord,
  };
}
