import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserPreferences {
  id?: string;
  user_id?: string;
  timezone: string;
  display_currency: string | null;
  language: string | null;
  density: 'compact' | 'comfortable' | 'spacious';
  number_format: string;
  date_format: string;
}

const DEFAULT_PREFS: UserPreferences = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Riyadh',
  display_currency: null,
  language: null,
  density: 'comfortable',
  number_format: 'en',
  date_format: 'YYYY-MM-DD',
};

/**
 * Per-user platform preferences (timezone, display currency, density, etc.)
 * Falls back to sensible defaults when no row exists yet.
 */
export function useUserPreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['user-preferences', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<UserPreferences> => {
      const { data } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data ? { ...DEFAULT_PREFS, ...(data as any) } : DEFAULT_PREFS;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<UserPreferences>) => {
      if (!user?.id) throw new Error('Not signed in');
      const next = { ...(query.data ?? DEFAULT_PREFS), ...patch, user_id: user.id };
      const { error } = await supabase
        .from('user_preferences')
        .upsert(next as any, { onConflict: 'user_id' });
      if (error) throw error;
      return next;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-preferences', user?.id] }),
  });

  return {
    prefs: query.data ?? DEFAULT_PREFS,
    isLoading: query.isLoading,
    update: update.mutate,
    isUpdating: update.isPending,
  };
}
