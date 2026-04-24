import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SitePhoto {
  id: string;
  project_id: string | null;
  photo_url: string;
  caption: string | null;
  category: string;
  gps_lat: number | null;
  gps_lng: number | null;
  tags: string[] | null;
  taken_at: string;
  created_at: string;
}

const PHOTO_CATEGORIES = [
  'progress', 'issue', 'before', 'after', 'safety', 'material', 'equipment', 'other'
] as const;

export function useCPMSSitePhotos(projectId?: string) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<SitePhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('cpms_site_photos').select('*').order('taken_at', { ascending: false }).limit(100);
    if (projectId) q = q.eq('project_id', projectId);
    const { data } = await q;
    if (data) setPhotos(data as unknown as SitePhoto[]);
    setLoading(false);
  }, [projectId]);

  const uploadPhoto = async (file: File, meta: { projectId: string; caption?: string; category?: string }) => {
    if (!user?.id) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('site-photos').upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('site-photos').getPublicUrl(path);

      let gps: { lat: number; lng: number } | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        gps = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch {}

      await supabase.from('cpms_site_photos').insert({
        user_id: user.id,
        project_id: meta.projectId || null,
        photo_url: urlData.publicUrl,
        caption: meta.caption || null,
        category: meta.category || 'progress',
        gps_lat: gps?.lat || null,
        gps_lng: gps?.lng || null,
        taken_at: new Date().toISOString(),
      } as any);

      toast.success('Photo uploaded!');
      await fetchPhotos();
    } catch (err: any) {
      toast.error('Upload failed: ' + (err.message || 'Unknown error'));
    }
    setUploading(false);
  };

  return { photos, loading, uploading, fetchPhotos, uploadPhoto, PHOTO_CATEGORIES };
}
