import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SavedView {
  id: string;
  user_id: string;
  module: string;
  view_name: string;
  filters: Record<string, string>;
  columns: string[];
  sort_config: { column?: string; direction?: 'asc' | 'desc' };
  grouping: string | null;
  is_shared: boolean;
  is_default: boolean;
  created_at: string;
}

export function useSavedViews(module: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ['saved-views', module, user?.id];

  const { data: views = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_views')
        .select('*')
        .eq('module', module)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SavedView[];
    },
    enabled: !!user && !!module,
  });

  const saveView = useMutation({
    mutationFn: async (view: Omit<SavedView, 'id' | 'user_id' | 'created_at' | 'module'>) => {
      const { error } = await supabase.from('saved_views').insert({
        user_id: user!.id,
        module,
        view_name: view.view_name,
        filters: view.filters as any,
        columns: view.columns as any,
        sort_config: view.sort_config as any,
        grouping: view.grouping,
        is_shared: view.is_shared,
        is_default: view.is_default,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const deleteView = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_views').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const myViews = views.filter(v => v.user_id === user?.id);
  const sharedViews = views.filter(v => v.is_shared && v.user_id !== user?.id);

  return { views, myViews, sharedViews, isLoading, saveView, deleteView };
}
