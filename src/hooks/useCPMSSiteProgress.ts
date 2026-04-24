import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface SitePhoto {
  id?: string;
  project_id: string;
  area?: string;
  phase?: string;
  description?: string;
  photo_url: string;
  thumbnail_url?: string;
  latitude?: number;
  longitude?: number;
  captured_at?: string;
  captured_by?: string;
  tags?: string[];
  created_at?: string;
}

export interface ProgressSnapshot {
  id?: string;
  project_id: string;
  area?: string;
  phase?: string;
  progress_pct: number;
  planned_pct: number;
  notes?: string;
  snapshot_date: string;
  recorded_by?: string;
  created_at?: string;
}

export interface SiteReport {
  id?: string;
  project_id: string;
  report_date: string;
  weather?: string;
  temperature_c?: number;
  wind_conditions?: string;
  manpower_count?: number;
  equipment_on_site?: string[];
  work_performed?: string;
  issues_encountered?: string;
  safety_observations?: string;
  visitor_log?: string;
  delay_hours?: number;
  delay_reason?: string;
  photos?: string[];
  status?: string;
  submitted_by?: string;
  approved_by?: string;
  approved_at?: string;
  created_at?: string;
}

export function useCPMSSiteProgress(projectId?: string) {
  const [photos, setPhotos] = useState<SitePhoto[]>([]);
  const [snapshots, setSnapshots] = useState<ProgressSnapshot[]>([]);
  const [siteReports, setSiteReports] = useState<SiteReport[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchAll = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [ph, sn, sr] = await Promise.all([
        supabase.from('cpms_site_photos' as any).select('*').eq('project_id', projectId).order('captured_at', { ascending: false }),
        supabase.from('cpms_progress_snapshots' as any).select('*').eq('project_id', projectId).order('snapshot_date', { ascending: false }),
        supabase.from('cpms_site_reports' as any).select('*').eq('project_id', projectId).order('report_date', { ascending: false }),
      ]);
      setPhotos((ph.data || []) as any[]);
      setSnapshots((sn.data || []) as any[]);
      setSiteReports((sr.data || []) as any[]);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const uploadPhoto = async (file: File, metadata: Partial<SitePhoto>) => {
    const filePath = `${projectId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('cpms-site-photos').upload(filePath, file);
    if (uploadError) { toast({ title: 'Upload error', description: uploadError.message, variant: 'destructive' }); return null; }

    const { data: urlData } = supabase.storage.from('cpms-site-photos').getPublicUrl(filePath);
    const photoUrl = urlData.publicUrl;

    const { data, error } = await supabase.from('cpms_site_photos' as any).insert({
      ...metadata,
      project_id: projectId,
      photo_url: photoUrl,
      captured_by: user?.id,
      captured_at: new Date().toISOString(),
    } as any).select().single();

    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return null; }
    toast({ title: 'Photo uploaded' });
    await fetchAll();
    return data;
  };

  const deletePhoto = async (id: string) => {
    const { error } = await supabase.from('cpms_site_photos' as any).delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Photo deleted' });
    await fetchAll();
    return true;
  };

  const saveSnapshot = async (snapshot: Partial<ProgressSnapshot>) => {
    const { data, error } = await supabase.from('cpms_progress_snapshots' as any)
      .upsert({ ...snapshot, project_id: projectId, recorded_by: user?.id } as any, { onConflict: 'project_id,area,phase,snapshot_date' })
      .select().single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return null; }
    toast({ title: 'Progress saved' });
    await fetchAll();
    return data;
  };

  const createSiteReport = async (report: Partial<SiteReport>) => {
    const { data, error } = await supabase.from('cpms_site_reports' as any)
      .insert({ ...report, project_id: projectId, submitted_by: user?.id } as any)
      .select().single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return null; }
    toast({ title: 'Site report created' });
    await fetchAll();
    return data;
  };

  const updateSiteReport = async (id: string, updates: Partial<SiteReport>) => {
    const { error } = await supabase.from('cpms_site_reports' as any).update(updates as any).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Report updated' });
    await fetchAll();
    return true;
  };

  const getProgressByArea = () => {
    const latest = new Map<string, ProgressSnapshot>();
    snapshots.forEach(s => {
      const key = `${s.area}-${s.phase}`;
      if (!latest.has(key) || (s.snapshot_date > (latest.get(key)!.snapshot_date))) {
        latest.set(key, s);
      }
    });
    return Array.from(latest.values());
  };

  useEffect(() => { fetchAll(); }, [projectId]);

  return {
    photos, snapshots, siteReports, loading, fetchAll,
    uploadPhoto, deletePhoto,
    saveSnapshot, getProgressByArea,
    createSiteReport, updateSiteReport,
  };
}
