import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface TimeEntry {
  id: string;
  project_id: string | null;
  cost_code: string | null;
  task_description: string | null;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  total_hours: number | null;
  gps_lat_in: number | null;
  gps_lng_in: number | null;
  status: string;
  productivity_rating: number | null;
  notes: string | null;
}

export function useCPMSTimeClock() {
  const { user } = useAuth();
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakStart, setBreakStart] = useState<Date | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('cpms_time_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('clock_in', { ascending: false })
      .limit(50);
    
    if (data) {
      setEntries(data as unknown as TimeEntry[]);
      const active = data.find((e: any) => e.status === 'active' && !e.clock_out);
      setActiveEntry(active as unknown as TimeEntry || null);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const getGPS = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 10000 }
      );
    });
  };

  const clockIn = async (projectId: string, costCode?: string, taskDesc?: string) => {
    if (!user?.id) return;
    const gps = await getGPS();
    const { error } = await supabase.from('cpms_time_entries').insert({
      user_id: user.id,
      project_id: projectId || null,
      cost_code: costCode || null,
      task_description: taskDesc || null,
      clock_in: new Date().toISOString(),
      status: 'active',
      gps_lat_in: gps?.lat || null,
      gps_lng_in: gps?.lng || null,
    } as any);
    if (error) { toast.error('Failed to clock in'); return; }
    toast.success('Clocked in successfully!');
    await fetchEntries();
  };

  const clockOut = async (rating?: number, notes?: string) => {
    if (!activeEntry) return;
    const gps = await getGPS();
    const clockOutTime = new Date();
    const clockInTime = new Date(activeEntry.clock_in);
    const totalMs = clockOutTime.getTime() - clockInTime.getTime();
    const totalHours = Math.max(0, (totalMs / 3600000) - ((activeEntry.break_minutes || 0) / 60));

    const { error } = await supabase.from('cpms_time_entries')
      .update({
        clock_out: clockOutTime.toISOString(),
        total_hours: Math.round(totalHours * 100) / 100,
        status: 'completed',
        productivity_rating: rating || null,
        notes: notes || null,
        gps_lat_out: gps?.lat || null,
        gps_lng_out: gps?.lng || null,
      } as any)
      .eq('id', activeEntry.id);
    if (error) { toast.error('Failed to clock out'); return; }
    toast.success(`Clocked out! ${totalHours.toFixed(1)} hours logged.`);
    setActiveEntry(null);
    setIsOnBreak(false);
    await fetchEntries();
  };

  const startBreak = () => {
    setIsOnBreak(true);
    setBreakStart(new Date());
    toast.info('Break started');
  };

  const endBreak = async () => {
    if (!activeEntry || !breakStart) return;
    const breakMins = Math.round((Date.now() - breakStart.getTime()) / 60000);
    const newTotal = (activeEntry.break_minutes || 0) + breakMins;
    await supabase.from('cpms_time_entries')
      .update({ break_minutes: newTotal } as any)
      .eq('id', activeEntry.id);
    setIsOnBreak(false);
    setBreakStart(null);
    toast.success(`Break ended (${breakMins} min)`);
    await fetchEntries();
  };

  return { activeEntry, entries, loading, isOnBreak, clockIn, clockOut, startBreak, endBreak, fetchEntries };
}
