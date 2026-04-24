import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addDays, differenceInDays, parseISO, format } from 'date-fns';

export interface ScheduleActivity {
  id: string;
  schedule_id: string;
  project_id: string | null;
  parent_activity_id: string | null;
  code: string;
  name: string;
  description: string | null;
  level_type: string; // stage, wbs, task, milestone
  start_date: string | null;
  end_date: string | null;
  duration: number | null;
  actual_start: string | null;
  actual_end: string | null;
  progress_pct: number | null;
  status: string;
  priority: string;
  responsible_user_id: string | null;
  resource_names: string | null;
  department: string | null;
  predecessors: any;
  successors: any;
  dependency_type: string;
  constraint_type: string | null;
  baseline_start: string | null;
  baseline_end: string | null;
  budget_value: number | null;
  weight_pct: number | null;
  is_critical: boolean | null;
  float_days: number | null;
  notes: string | null;
  type: string | null;
  sort_order: number | null;
  wbs_id: string | null;
  children?: ScheduleActivity[];
  _depth?: number;
}

export interface ScheduleStats {
  totalDuration: number;
  plannedEnd: string | null;
  forecastEnd: string | null;
  overallProgress: number;
  delayedCount: number;
  completedCount: number;
  upcomingMilestones: ScheduleActivity[];
  baselineVariance: number;
}

export function useProjectSchedule(projectId: string | undefined) {
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [activities, setActivities] = useState<ScheduleActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchSchedule = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      // Get or create schedule
      let { data: schedules } = await supabase
        .from('cpms_schedules' as any).select('id').eq('project_id', projectId).limit(1);

      let sid: string;
      if (!schedules || schedules.length === 0) {
        const { data: newSchedule, error } = await supabase
          .from('cpms_schedules' as any)
          .insert({ project_id: projectId, name: 'Master Schedule', created_by: user?.id, status: 'draft' } as any)
          .select('id').single();
        if (error) throw error;
        sid = (newSchedule as any).id;
      } else {
        sid = (schedules[0] as any).id;
      }
      setScheduleId(sid);

      const { data, error } = await supabase
        .from('cpms_schedule_activities' as any)
        .select('*')
        .eq('schedule_id', sid)
        .order('sort_order');
      if (error) throw error;
      setActivities((data || []) as unknown as ScheduleActivity[]);
    } catch (e: any) {
      toast({ title: 'Error loading schedule', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [projectId, user?.id]);

  const addActivity = async (data: Partial<ScheduleActivity>) => {
    if (!scheduleId || !projectId) return null;
    try {
      // Auto-calc duration
      let duration = data.duration;
      if (data.start_date && data.end_date && !duration) {
        duration = differenceInDays(parseISO(data.end_date), parseISO(data.start_date)) + 1;
      }
      let endDate = data.end_date;
      if (data.start_date && duration && !endDate) {
        endDate = format(addDays(parseISO(data.start_date), duration - 1), 'yyyy-MM-dd');
      }

      const siblings = activities.filter(a => a.parent_activity_id === (data.parent_activity_id || null));
      const sortOrder = siblings.length;

      const { data: created, error } = await supabase
        .from('cpms_schedule_activities' as any)
        .insert({
          ...data,
          schedule_id: scheduleId,
          project_id: projectId,
          duration,
          end_date: endDate,
          sort_order: sortOrder,
        } as any)
        .select().single();
      if (error) throw error;
      toast({ title: 'Activity created' });
      await fetchSchedule();
      return created;
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      return null;
    }
  };

  const updateActivity = async (id: string, updates: Partial<ScheduleActivity>) => {
    try {
      // Auto-calc
      if (updates.start_date && updates.end_date) {
        updates.duration = differenceInDays(parseISO(updates.end_date), parseISO(updates.start_date)) + 1;
      } else if (updates.start_date && updates.duration) {
        updates.end_date = format(addDays(parseISO(updates.start_date), updates.duration - 1), 'yyyy-MM-dd');
      }
      const { error } = await supabase.from('cpms_schedule_activities' as any).update(updates as any).eq('id', id);
      if (error) throw error;

      // Cascade dependencies
      if (updates.end_date || updates.start_date) {
        const updated = { ...activities.find(a => a.id === id)!, ...updates };
        await cascadeDependencies(updated);
      }

      toast({ title: 'Activity updated' });
      await fetchSchedule();
      return true;
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  const deleteActivity = async (id: string) => {
    try {
      // Delete children first
      const children = activities.filter(a => a.parent_activity_id === id);
      for (const child of children) {
        await deleteActivity(child.id);
      }
      const { error } = await supabase.from('cpms_schedule_activities' as any).delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Activity deleted' });
      await fetchSchedule();
      return true;
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      return false;
    }
  };

  const cascadeDependencies = async (changedActivity: ScheduleActivity) => {
    const dependents = activities.filter(a => {
      if (!a.predecessors || !Array.isArray(a.predecessors)) return false;
      return (a.predecessors as any[]).some(p => (p.id || p) === changedActivity.id);
    });

    if (dependents.length === 0 || !changedActivity.end_date) return;

    const changedEnd = parseISO(changedActivity.end_date);

    for (const dep of dependents) {
      if (!dep.start_date || !dep.end_date) continue;
      const depType = dep.dependency_type || 'FS';
      let newStart: Date;

      switch (depType) {
        case 'SS': newStart = changedActivity.start_date ? parseISO(changedActivity.start_date) : changedEnd; break;
        case 'FF': {
          const dur = differenceInDays(parseISO(dep.end_date), parseISO(dep.start_date));
          newStart = addDays(changedEnd, -dur);
          break;
        }
        case 'SF': newStart = changedActivity.start_date ? parseISO(changedActivity.start_date) : changedEnd; break;
        default: newStart = addDays(changedEnd, 1); break; // FS
      }

      const depDuration = differenceInDays(parseISO(dep.end_date), parseISO(dep.start_date));
      const newEnd = addDays(newStart, depDuration);
      const newStartStr = format(newStart, 'yyyy-MM-dd');
      const newEndStr = format(newEnd, 'yyyy-MM-dd');

      if (newStartStr !== dep.start_date) {
        await supabase.from('cpms_schedule_activities' as any)
          .update({ start_date: newStartStr, end_date: newEndStr } as any)
          .eq('id', dep.id);
      }
    }
  };

  const saveBaseline = async (name: string) => {
    if (!scheduleId || !projectId) return;
    try {
      // Save baseline dates on activities
      for (const a of activities) {
        if (a.start_date && !a.baseline_start) {
          await supabase.from('cpms_schedule_activities' as any)
            .update({ baseline_start: a.start_date, baseline_end: a.end_date } as any)
            .eq('id', a.id);
        }
      }
      // Save snapshot
      await supabase.from('cpms_schedule_baselines' as any).insert({
        schedule_id: scheduleId,
        project_id: projectId,
        name,
        created_by: user?.id,
        data_snapshot: activities,
      } as any);
      toast({ title: 'Baseline saved', description: name });
      await fetchSchedule();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const duplicateActivity = async (id: string) => {
    const source = activities.find(a => a.id === id);
    if (!source) return;
    const { id: _id, ...rest } = source;
    await addActivity({ ...rest, code: source.code + '-copy', name: source.name + ' (Copy)' });
  };

  const convertToMilestone = async (id: string) => {
    await updateActivity(id, { level_type: 'milestone', type: 'milestone', duration: 0 });
  };

  // Build tree
  const buildTree = (items: ScheduleActivity[]): ScheduleActivity[] => {
    const map = new Map<string, ScheduleActivity>();
    const roots: ScheduleActivity[] = [];
    items.forEach(i => map.set(i.id, { ...i, children: [] }));
    items.forEach(i => {
      const node = map.get(i.id)!;
      if (i.parent_activity_id && map.has(i.parent_activity_id)) {
        map.get(i.parent_activity_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  };

  const flattenTree = (nodes: ScheduleActivity[], depth = 0): ScheduleActivity[] => {
    const result: ScheduleActivity[] = [];
    for (const node of nodes) {
      result.push({ ...node, _depth: depth });
      if (node.children && node.children.length > 0) {
        result.push(...flattenTree(node.children, depth + 1));
      }
    }
    return result;
  };

  // Stats
  const getStats = (): ScheduleStats => {
    const withDates = activities.filter(a => a.start_date && a.end_date);
    const starts = withDates.map(a => parseISO(a.start_date!).getTime());
    const ends = withDates.map(a => parseISO(a.end_date!).getTime());
    const minStart = starts.length ? new Date(Math.min(...starts)) : null;
    const maxEnd = ends.length ? new Date(Math.max(...ends)) : null;
    const totalDuration = minStart && maxEnd ? differenceInDays(maxEnd, minStart) + 1 : 0;

    const weightedProgress = activities.reduce((sum, a) => sum + (a.progress_pct || 0) * (a.weight_pct || 1), 0);
    const totalWeight = activities.reduce((sum, a) => sum + (a.weight_pct || 1), 0);
    const overallProgress = totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;

    const delayedCount = activities.filter(a => a.status === 'delayed').length;
    const completedCount = activities.filter(a => a.status === 'completed' || (a.progress_pct && a.progress_pct >= 100)).length;
    
    const now = new Date();
    const upcomingMilestones = activities
      .filter(a => (a.level_type === 'milestone' || a.type === 'milestone') && a.end_date && parseISO(a.end_date) >= now)
      .sort((a, b) => parseISO(a.end_date!).getTime() - parseISO(b.end_date!).getTime())
      .slice(0, 5);

    const baselineVariance = activities.reduce((sum, a) => {
      if (a.baseline_end && a.end_date) {
        return sum + differenceInDays(parseISO(a.end_date), parseISO(a.baseline_end));
      }
      return sum;
    }, 0);

    return {
      totalDuration,
      plannedEnd: maxEnd ? format(maxEnd, 'yyyy-MM-dd') : null,
      forecastEnd: maxEnd ? format(maxEnd, 'yyyy-MM-dd') : null,
      overallProgress,
      delayedCount,
      completedCount,
      upcomingMilestones,
      baselineVariance,
    };
  };

  const tree = buildTree(activities);
  const flatList = flattenTree(tree);

  return {
    scheduleId,
    activities,
    flatList,
    tree,
    loading,
    fetchSchedule,
    addActivity,
    updateActivity,
    deleteActivity,
    saveBaseline,
    duplicateActivity,
    convertToMilestone,
    getStats,
  };
}
