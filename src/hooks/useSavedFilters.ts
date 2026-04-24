import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SavedFilter {
  id: string;
  user_id: string;
  entity_name: string;
  filter_name: string;
  filter_config: Record<string, any>;
  is_default: boolean;
  is_shared: boolean;
  company_id: string | null;
  created_at: string;
}

export function useSavedFilters(entityName: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const qk = ['saved-filters', entityName];

  const { data: filters = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const { data } = await supabase
        .from('app_saved_filters')
        .select('*')
        .eq('entity_name', entityName)
        .order('is_default', { ascending: false })
        .order('filter_name');
      return (data || []) as SavedFilter[];
    },
    enabled: !!user && !!entityName,
  });

  const saveFilter = useMutation({
    mutationFn: async (filter: { filter_name: string; filter_config: Record<string, any>; is_shared?: boolean }) => {
      await supabase.from('app_saved_filters').insert({
        user_id: user!.id,
        entity_name: entityName,
        filter_name: filter.filter_name,
        filter_config: filter.filter_config,
        is_shared: filter.is_shared || false,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  const deleteFilter = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('app_saved_filters').delete().eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      // Clear existing defaults
      await supabase.from('app_saved_filters')
        .update({ is_default: false })
        .eq('entity_name', entityName)
        .eq('user_id', user!.id);
      // Set new default
      await supabase.from('app_saved_filters').update({ is_default: true }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  const defaultFilter = filters.find(f => f.is_default);

  return {
    filters,
    isLoading,
    saveFilter: saveFilter.mutate,
    deleteFilter: deleteFilter.mutate,
    setDefault: setDefault.mutate,
    defaultFilter,
    isSaving: saveFilter.isPending,
  };
}
